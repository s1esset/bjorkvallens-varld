# SESSIONS.md — sessionslogg

En post per avslutad session, **nyast överst**. Skrivs av `/avsluta`. Syftet: nästa session
(eller nästa person) ska förstå var projektet står utan att läsa chatthistorik eller git-log.

Format:

```
## ÅÅÅÅ-MM-DD · v<version>
**Byggt:** vad som gjordes, i klartext
**Commits:** <hash> <ämne> · <hash> <ämne>
**Öppet:** vad som återstår / nästa naturliga steg
```

---

## 2026-08-12 · v1.152.0 · Additiv glöd: sju kandidater in, en kund ut

**Byggt:** nattköns **N7** (LYFTPLAN C4). Uppdraget var uttryckligen att läsa om listan innan
något byggs — och det var rätt uppdrag: **sex av sju namn föll, och villkoret de skulle prövas
mot visade sig självt vara fel formulerat.**

**Sonden först.** `scripts/_glodkandidat.mjs` (ny) ställer den faktiska idiomen — `glod()` ur
`lib/glod.js` — på den faktiska bottnen i varje kandidatspel, **växelvis additiv och normal**,
och läser pixlarna. `lagerelden` (känd vit klump) och `trollblandning` (känd osynlig) går med
som **kontrollrader**: reproducerar sonden inte de två redan kända fallen är trösklarna
påhittade, inte kalibrerade. Båda reproducerades.

| rad | botten | vinst¹ | vit %² | kroma | utfall |
|---|--:|--:|--:|--:|---|
| `enhorning-glitterbajs` | 225 | +27,5 | **74,3** | 0,03 | NEJ — klipper till vitt |
| `blixt-och-dunder` | 214 | +25,6 | **30,3** | 0,13 | NEJ — klipper till vitt |
| `natskott-pa-stan` | 171 | +33,6 | 19,6 | **0,07** | NEJ — färglöst dis i dagsljus |
| `glittergrottan` (kristallfärg) | 46 | **+9,7** | 0,0 | 0,32 | NEJ — add ≈ normal |
| `golvet-ar-lava` över ytan | 187 | **+44,2** | 0,0 | 0,52 | **JA** |
| `golvet-ar-lava` mot klippan | 117 | **+40,8** | 0,0 | 0,51 | **JA** |

¹ luminans additivt minus normalt — vad idiomet är VÄRT. ² pixlar med alla kanaler ≥ 250.

**Villkor 1 hette "mörk botten". Det är fel.** Det heter **takhöjd i de KANALER källan lyser
i**, och bottnen ska ligga i **MITTEN** — båda ytterlägena dödar idiomet från var sitt håll. En
nästan svart botten ger vinst **+9,7**, för på svart *är* `källa + 0` samma sak som `källa`;
mörkret är ett skydd mot klippning, inte ett skäl att byta blandning. Och listans enda kund blev
ett **ljust** spel: lavan mäter 187 i luminans men är mättat orange, alltså nästan tom i grönt
och blått — där låg takhöjden.

**Två gånger byggdes en regel som "fångade" `trollblandning` — och båda gångerna dödade den
lavan, alltså det enda rätta fyndet.** Bubblorna klarar varje mätbar tröskel; de faller ändå,
för de är **föremål ritade mörkare än sin botten**, och additiv blandning kan bara göra dem
ljusare. Det är en fråga om AVSIKT, och sonden låtsas inte att en tröskel avgör den: den mäter
teckenbytet, skriver ut det som en infokolumn och lämnar domen åt läsaren. Två mätfel städades
bort på vägen: en skärmövergångs cremeblänk mätte kolsvarta `glittergrottan` till botten
253,246,227, och en provpunkt låg mitt i den gröna Gå-knappen.

**Kunden.** `golvet-ar-lava` fick ett band liggande glöder (`ratio` 2,2) längs flodens yta plus
en glöd mot varsin klippvägg, andandes med egen fas ur `_update` och **uppflammande i
`_lavaReact`** när en sten slår ner. Mätt mot samma bild före ändringen: luften ovanför lavan
**255,173,104 → 255,203,116**, klippan närmast floden **158,112,76 → 201,133,84**, avtagande med
avståndet (+11 vid x 1100 — ljus som faller av, inte ett fält). Himlen högt uppe och lavaytan
själv **oförändrade**, 0,0 % vita pixlar överallt.

**Commits:** `2756928` feat(golvet-ar-lava) lavan lyser upp luften och klippan
**Kontroll:** `check` 0 fel/0 varningar · `test:all` 72/72 gröna · röstkön tom.
**Öppet:** ägarkön tom. Nattkön står på **N8** (LYFTPLAN C8 + C10: `setDetaljniva` i skalet,
`BitmapText` för räknare, `roundPixels`, `CullerPlugin`).

---

## 2026-08-12 · v1.151.0 · Kontexten kan vägras — och de sista gradienterna

**Byggt:** nattkörningens varv VII. Två punkter: ÅTGÄRDER **V15** (som låg öppen med tre
obesvarade frågor) och nattköns **N6** (LYFTPLAN C1:s fyra sista spel).

**V15 — `glittergrottan` dog vid start ~23 % av gångerna, ENSAM.** Föregående session mätte
symptomet (3 fall av 10) men inte orsaken. Sex nya körningar gav 1 fall till, alltså **6 av 26
sammanlagt** — fyndet är äkta och inte en engångshändelse.

**Diagnosen låg i att läsa konsolen ORDAGRANT: det var TVÅ olika fel, inte ett.**

| # | rad | vad den betyder |
|---|---|---|
| 1 | `Could not create a WebGL context … GL_VENDOR = Disabled … BindToCurrentSequence failed` | GPU-processen hinner inte binda; webbläsaren kör helt utan GPU |
| 2 | `Web page caused context loss and was blocked` | **Chromes egen spärr**, som slår till EFTER fel 1 och gäller SIDAN |

Nummer 2 förklarar varför inget omförsök hjälper — och den förutsägelsen höll: omtagningarna
räddade **0 av 2** fall. Två spår mättes bort innan en rad kod skrevs: **attributen är
oskyldiga** (32 råa `getContext` över fyra uppsättningar föll 0 gånger — och three gör själv ett
attributfritt omförsök internt som faller med), och **det är inget kontexttak** (bara EN duk
finns på sidan när det smäller).

**Tre lärdomar värda mer än fixen:**

1. **Ett bibliotek kan skriva konsolfel innan ditt `catch` körs.** three lyssnar på
   `webglcontextcreationerror` och `console.error`:ar i lyssnaren; konstruktorn kastar först
   efteråt. Första versionen av fixen hade full bild, korrekt reservläge — och **rött test av 8
   konsolfel**. Lösningen är att hämta resursen själv (`getContext` utan lyssnare är tyst) och
   lämna den färdig: `new WebGLRenderer({ canvas, context })`.
2. **Sonden mätte fel innan spelet gjorde det.** En DELAD webbläsare över försöken gör spärren
   till en kaskad — försök 10–12 föll alla, vilket såg ut som 100 % frekvens. `npm run test`
   startar en färsk webbläsare per körning; sonden måste göra likadant. (Sjätte gången i det
   här repot som sonden var den trasiga saken.)
3. **En fix som gör testet grönt får inte göra det tyst.** Reservläget räddar bilden, så
   körningen blir grön — därför loggas vägran som varningen `ingen-3d-kontext`.

**Byggt:** `sakraRenderare()` i `lib/three3d.js` returnerar `null` i stället för att kasta, och
`glittergrottan._utan3D()` ritar ett lugnt **fritt läge** med samma kristaller, toner och
glitter — ingen ordning, inget mål, inget som kan gå fel. Medvetet **inte** en 2D-kopia av
grottan: ordningsregeln kräver facit-rad, glimmerdjur och grottans ljus, och byggd i 2D vore det
ett ANNAT spel att underhålla. **Mätt: 6/26 röda → 16/16 gröna**, varav 2 i reservläge (exakt de
körningar som förut var röda med tom skärm).

**N6 — C1:s fyra sista spel.** Mätt med `_plattprobe` före/efter:

| spel | största platta fält före | efter |
|---|---|---|
| `vart-tog-det-vagen` | **35 160** (den blå muggen) | **23 040** (skalets creme) |
| `tarta-i-ansiktet` | huvudet platt `#fff0e0` | ut ur listan (**24 576** = fonden) |
| `enkelt-pussel` | motiven platta | 28 560 (skalets creme) |
| `hamburgerbygget` | bänk + golv i var sin ton | 25 837 |

I de två spel där ett SPELOBJEKT var största fältet är objektet borta ur listan, och överst
ligger nu skalets egen bakgrund. Det är rätt ställe att sluta.

⚠️ **Near-white-fällan gäller alla fyllningarna, inte bara `groundFill`.** Clownens hud
(`0xfff0e0`) blev **grågrumlig** av standardens 32 % mörkning — grönt test hela tiden, det syntes
bara i skärmdumpen. Ljusa ytor vill ha ~0,08–0,16.
❌ **`rimLight` är struken som "väntar på sin första kund", med mätning:** på clownen hamnar hela
vänstra ögat inne i glansfläcken (avstånd mellan centrumen 11,7 px, ögats ytterpunkt 39,7 px,
fläckens radie 51 px). Den passar en container vars STORA form är slät — inte ett ansikte.

**Ny sond:** `scripts/_kontextprobe.mjs` — attribut-armarna växelvis · `--spel` (färsk
webbläsare per försök, konsolen ordagrant) · `--reserv` (tvingar fram vägran genom hela den
riktiga vägen, 5/5).

**Commits:** `3478be9` fix(glittergrottan) kontexten kan vagras · `24b4b79`
feat(vart-tog-det-vagen) muggarna ar cylindrar · `d002341` feat(tarta-i-ansiktet) clownen far
volym · `362ce21` feat(enkelt-pussel) motiven far volym · `ceb60e8` feat(hamburgerbygget) banken
och golvet
**Kontroll:** `check` 0 fel/0 varningar · `test:all` 72/72 · `_kontextprobe --reserv` 5/5 ·
16/16 gröna glittergrottan-körningar · röstkön tom.
**Öppet:** ägarkön tom. Nattkön står på **N7** (LYFTPLAN C4: additiv glöd — kräver att listans
sju kandidater läses om mot BÅDA villkoren, mörk botten OCH takhöjd i källan).

---

## 2026-08-11 · v1.150.0 · Pruttbadets sista lista: bubblorna tar plats, skummet blev skum

**Byggt:** ägaren godkände `flipperspel` v1.144.0 ("spelat och ser bra ut") och bad om
`pruttbad`. Kvar där låg §4-punkt 5 — den enda av hens fem önskemål som medvetet inte byggts,
utan mätts. Mätpassets fyra punkter är nu alla byggda, i två commits delade efter vad de
faktiskt ÄR: fysik i den ena, rendering och återkoppling i den andra.

| # | Mätpassets punkt | Före | Efter |
|---|---|---|---|
| 1 | Bubblor går rakt igenom varandra | 47,8 px inträngning, löstes **aldrig** upp (49,2 efter 40 rutor) | 8,4 px efter 40 rutor, **0 px efter 120** |
| 2 | Bubblor går rakt igenom Zacke | **92,4 px** in i kroppen, 492 bubbel-bildrutor inuti honom | **1,7 px**, 0 rutor |
| 3 | Skumkroppen är en platt platta | **0,7 %** kantpixlar (en platta) | **11 %** — packade bubblor |
| 4 | Flyt-texterna staplas | **11 texter samtidigt, 0 px isär** | max 2, aldrig närmare än 250 px |

**Den tyngsta lärdomen: klykan mellan Zackes ben var en återvändsgränd, och fixen var
födelsepunkten — inte kraften.** Bubblorna föds på karbottnen under tryckpunkten, och där står
hans vader: en bubbla på (386, 574) startade **50 px inne i vänster ben**. Ut fanns ingen väg —
låren står **44–50 px isär hela vägen upp** (en bubbla på 34 px behöver 68), de möts vid höften,
magen stänger taket, och lyftkraften pressar bubblan mot just den stängda änden. Uppmätt: **två
av fyra bubblor guppade mellan y 465 och 605 i 260 bildrutor och kom aldrig ut.** Ingen
tuning av knuffen hade löst det. `_freeSpawnX()` föder dem vid närmaste fria sida i stället, och
klykan är därmed onåbar i spel (tvingar man ändå in en bubbla löser anti-stuck-vakten den på 4 s).

**Tre mätlärdomar:**

1. **Mot en STATISK kropp ska överlappet lösas HELT, inte som en andel.** En andel ger inte
   kontakt utan JÄMVIKT: lyftkraften bär in bubblan ~3,7 px/steg och 0,35 tar ut 35 % av det som
   ligger inne, alltså stannar den ~7 px inne i benet för alltid (uppmätt 6,8 → 1,7 efter bytet).
   Mellan två bubblor är andelen däremot rätt — en fjäder där vore en energiKÄLLA som pumpar
   klasen, exakt fällan höjdfältet gick i förra passet.
2. **"Största enskilda ton" är fel mått på platthet när ytan ritas med alfa.** Måttet gav **10 %
   både före och efter** medan bilderna sida vid sida är uppenbart olika. Det "platt" betyder är
   att ytan saknar INRE KANTER; med kanttäthet blev utslaget 0,7 % mot 11 %. `_plattprobe` svarar
   på VILKEN ton, inte på om ytan har struktur — det är två olika frågor.
3. **Sidofynd som bara bilden kunde ge: integratorn hade väggar och yta men INGET GOLV.**
   Födelsehöjden är en fast punkt oavsett storlek, så en bubbla ur den stora flaskan (r upp till
   96) nådde y 670 och låg delvis **utanför karet, ovanpå badrumsgolvet** — utan ett enda
   konsolfel. Lägsta bubbelkant nu exakt 604 = karbottnen.

**Och fem gånger var det SONDEN som hade fel, inte spelet** — samma lärdom som förra passet,
nu med fem nya varianter: (a) den nollade `_foam.level` i stället för att montera om, så
firandet från de bubblor sonden själv poppat nollade skummet mitt i mätfönstret; (b) den lät
nivån klaras under mätningen, varpå **firandets bubbelsvärm** hamnade i mätvärdet och
rapporterade 98,9 px inträngning i ett par som omöjligt kan tränga in mer än 72; (c) den skrev
över `b.x` efter `_pushBubble` och mätte därför ett läge spelet inte längre kan hamna i, vilket
rapporterade en byggd fix som utebliven; (d) `_goalFoam = 1e9` — frysningen som räddade
fysikmätningen — **förstörde skummätningen**, eftersom skummets höjd är andelen `level/goalFoam`
och ett spärrat mål ger höjden noll; (e) `nav.go('game')` när man redan ÄR i spelet monterar inte
om, så bilden blev skalets creme och `_alive` falskt.

**Ny sond:** `scripts/_bubbelprobe.mjs` (**14 kontroller**: klasens upplösning över tid,
inträngning i Zacke, födelsepunkten, klykan som återvändsgränd, skummets kanttäthet,
flyt-texternas antal och avstånd, plus vakterna framsteg · ingen fastnar · exit).

**Commits:** `67742ce` feat(pruttbad) bubblorna tar plats · `6b4d887` feat(pruttbad) skummet
blev en massa
**Kontroll:** `check` 0 fel/0 varningar · `test pruttbad` grön · `test:all` 72/72 ·
`_bubbelprobe` 14/14 · `_perspektivprobe` 26/26 · `_badprobe` 8/8 · `_tvalprobe` grön ·
`_idleprobe` 0 · 0 fynd i `.test-logs/pruttbad.json`.
**Öppet:** **ägarkön är tom igen** — `flipperspel` godkänt, hela pruttbadets §4 avklarad. Nästa
naturliga steg är nattkön (`.claude/state/nattkorning.md`, står på **N6**). Bygget är omgjort,
så nästa telefontest hämtar v1.150.0.

---

## 2026-08-11 (natt) · v1.148.0 · Hela pruttbadets §4-lista: ägarens fem önskemål avklarade

**Byggt:** ägarens fem önskemål i `docs/games/pruttbad.md` §4 — den enda kö som bar hens egna ord
— togs i tur och ordning. Fyra byggdes, det femte var uttryckligen ett *mätuppdrag* och behandlades
som ett sådant.

| # | Önskemål | Utfall |
|---|---|---|
| 1 | *"vet inte om man ser badet uppifrån eller från sidan"* | **Rent sidoperspektiv.** `73cd6d1` |
| 2 | Propp att dra ut, kran att trycka på | **Nivån blev ett levande värde.** `bf5a18a` |
| 3 | Tre schampoflaskor → olika bubbelstorlek | **Tre riktiga knappar, tre sorter.** `cd6ab47` |
| 4 | Ankan omfördelar vatten och bubblor | **Ytan blev ett 1D-höjdfält.** `6ef6375` |
| 5 | "Bättre vätske- och bubbelfysik" | **Mätpass skrivet, ingen kod ändrad.** `1810a10` |

**Punkt 1 var inte en smakfråga, och det gick att visa.** Frågan "uppifrån eller från sidan?" blev
mätbar så fort man skrev ner VAD i bilden som bär vilken läsning. Scenen hade **tre toppvy-signaler
och nästan inga sidovy-signaler**: karet täckte sina egna fötter (kroppen gick till y 680, fötterna
satt 596–670 *bakom* den) och gick dessutom ner genom golvlinjen; vattnet fyllde en rundad rektangel
ut i alla fyra hörn; och — starkast av de tre — **ankan flöt 100 px under ytan och kunde parkeras
var som helst i ett 2D-vattenfält**. Den sista satt i **spelbarheten**, inte i grafiken, vilket är
varför ingen bildjustering hade räckt.

**Punkt 5 byggdes medvetet INTE.** Docen säger uttryckligen "mät först och skriv ner VAD som ser fel
ut i bild innan något ändras". `_tvalprobe` kom tillbaka **10/10 grön**, alltså var tvålvattnet
aldrig problemet. Bilden gav i stället fyra punkter, varav den tyngsta är att **bubblorna går rakt
igenom varandra** (fem–sex i en synlig klase). Två av de fyra är rendering och återkoppling, inte
fysik, och bör inte buntas in i "fysiken". Listan ligger i §4 och väntar på ägarens prioritering.

**Fyra buggar ramlade ut på vägen som inget grönt test såg:**

1. **Mållinjen var dold bakom kar-kanten från nivå 2 och uppåt.** `_goalY` bottnade på 248 — mitt i
   kantens 13 px-stroke, som ritas efter den. Måldottarna fanns alltså inte i bild i någon runda
   utom de två första.
2. **Det gömda fyndet kunde placeras högre än skummet någonsin når.** Spannet mättes mot mållinjen,
   men kronan stannar `CROWN`=20 px under den → fynd över ~70 % kunde **aldrig** hittas. Äldre än
   den här sessionen (gränsen låg på 71 % förut), alltså ungefär **var femte runda**.
3. **Fyndets armering krävde en OBSERVERAD bildruta** med skum under sig — en enda jättebubbla ger
   upp till 90 skum mot ett mål på 70, så hoppar skummet förbi i ett steg armeras det aldrig.
   `_badprobe` gick från 2 av 4 röda till **8/8 fem körningar i rad**.
4. **Mina egna träffytor bröt P0 genom att vara FÖR STORA:** 104 px med 120 px mellan mittpunkterna
   ger 16 px lucka, under kravet 24. 96 + 24 = 120 är den enda exakta passningen.

**Tre lärdomar värda att bära vidare:**

1. **En impuls varje bildruta är en konstant kraft, inte en våg.** Dämpningen tar 2,8 % per steg, så
   jämvikten blir insatsen/0,028 ≈ 36× — ett halvt sekunds drag pumpade höjdfältet till sitt tak.
   Och en "dell som dras mot ett måldjup" är en energiKÄLLA som aldrig lugnar sig (resthastighet
   0,367 efter fyra sekunder). Rätt modell: **dellen är fältets VILOLÄGE**, fältet bär bara
   avvikelsen, och vågor uppstår av att viloläget FLYTTAR SIG. Det går inte att pumpa, och det tar
   slut.
2. **Dämpningen måste ligga efter spridningen.** Låg den före blev spridningens eget bidrag odämpat,
   och för moden där varannan stödpunkt går upp och varannan ner är `l + r − 2h` lika med −4h: två
   pass gav styvhet 0,88 mot dämpning 0,972, alltså en nästan ostabil svängning vid Nyquist.
3. **Ett delat mönster kanske inte går att dela.** Docen pekade på `plask-i-vattnet` för undanträngd
   volym, men den vätskan är SPH-partiklar i en `Flytvolym` som kräver en matter-värld. Det som bar
   över var dess **varning** (undanträngning lyfter HELA ytan → håll bredden smalare än föremålet),
   inte dess kod.

**Och tre gånger var det SONDEN som hade fel, inte spelet** — samma lärdom som
`probe-before-believing`: (a) mätblocket ärvde 415 skum mot ett mål på 70 och hade alltså redan
klarat rundan, (b) ett 40-bildrutors fönster mätte en sträcka där kraften per definition är noll,
(c) bubblans egen slumpade vobbelfas gav BÅDA tecknen ur samma kod (47,8 mot 35,7 i en körning,
45,5 mot 64,0 i nästa). Först med fasen nollad och armarna växelvis blev effekten synlig:
**−24 px bort från ankan mot +63 px utan henne.**

**Refaktorn gjordes säker genom att ta bort, inte lägga till:** modulkonstanten `SURFACE_Y` (30
användningar) **raderades helt** i stället för att lämnas kvar bredvid det nya levande värdet. Varje
metod som rör vattnet tar `const SURFACE_Y = this._surf` som första rad — en glömd rad blir då ett
ReferenceError som testet fångar, i stället för vatten som tyst ritas på fel höjd.

**Nya sonder:** `_perspektivprobe.mjs` (**26 kontroller**: sidovyns läsbarhet i bild, nivåkontroll,
P0-träffytor, vågfält, undanträngd volym, bubbelknuff med armarna växelvis) ·
`_bubbelbild.mjs` (fyller badet med alla tre bubbelsorterna och sparar bilden — underlaget för §4:5).

**Mätt:** `check` 0 fel/0 varningar · `test:all` **72/72** · `_perspektivprobe` **26/26** ·
`_badprobe` **8/8 ×5** · `_idleprobe` **0** · `_tvalprobe` **10/10** · `_tystprobe` oförändrat 6 ·
0 fynd i `.test-logs/pruttbad.json` · 6 nya röstklipp (0 failed).

**Sidofynd till ÅTGÄRDER V14b:** ett svep loggade `tom-bild-omtagen ×2 — gl-kontext FÖRLORAD` i
`tvatta-djuret`. Det är **precis den mekanism vakten byggdes för**, nu mätt i stället för gissad:
stage och värld hade sina barn, duken rätt storlek, sidan synlig — det var WebGL-kontexten som
försvann. Fyndet vandrar dessutom mellan spel igen (`golvet-ar-lava` svepet före), vilket stärker
att det hör till SVITEN och inte till något spel. Raden uppdaterad i `docs/ATGARDER.md`.

**Commits:** `73cd6d1` fix(pruttbad) sidoperspektiv · `bf5a18a` feat(pruttbad) propp+kran ·
`cd6ab47` feat(pruttbad) schampoflaskor · `6ef6375` feat(pruttbad) höjdfält ·
`1810a10` docs(pruttbad) mätpass §4:5

**Öppet:** **ägarkön är tom** — allt hen rapporterat och önskat är gjort. Nästa naturliga steg är
antingen nattkön (`.claude/state/nattkorning.md`, står på **N6**) eller `pruttbad` §4:5-listan om
ägaren vill ha den. Bygget är omgjort, så nästa telefontest hämtar v1.148.0.

## 2026-08-11 (sen kväll) · v1.144.0 · Femte speltestet: fenan var en kil, och fastnar-vakten såg det aldrig

**Byggt:** ägaren testade v1.143.0. `trollblandning` godkänd ("funkar bättre nu med 2 / utökad
hylla"). `flipperspel` bar två rapporter — *"kan fortfarande få kulan att fastna"* och
*"studskuddarna är för nära kanten så kulan kan inte åka under"* — som visade sig ha **samma rot**,
plus en andra defekt som bara blev synlig när den första var borta. ÅTGÄRDER **#7**, `76dc0d1`.

| Fel | Utfall |
|---|---|
| Fenan mot lanvägen | Fenan låg på (452,500), nästan **parallell** med lanvägen: kanalen mätte **58 px för en kula på 56**. Fenorna **+50 px inåt, −40 px upp** → (502,460)/(778,460), kanal **110 px**. |
| Banans fickor | `slumpaUt` skyddar mot att kulan **kilas fast MELLAN** två ytor, inte mot att den blir **liggande OVANPÅ**. Ny `hittaFickor()` + `klarhetsfalt()` i `lib/utplacering.js`; `_samplaBana` kastar om **och plockar bort dämmaren**. Fickor **8 på 8 rundor → 0 på 12**. |

**Tre lärdomar värda att bära vidare:**

1. **Ett mått taget i fel riktning ser friskt ut.** Den gamla kommentaren mätte luckan mellan fena
   och lanväg **vågrätt** (126 px) och drog slutsatsen "ingen kil". Kulan färdas **längs** lanvägen,
   så måttet är **vinkelrätt** — och där var det 58 px. *Mät längs den riktning saken rör sig i.*
2. **En räddningströskel på STILLASTÅENDE missar en långsam kretsgång.** Fastnar-vakten kräver
   `hastighet < 0,7` i 2,6 s. I fickan **rullade** kulan, så vakten löste aldrig ut: **0 räddningar
   på 90 fastnade släpp**. Det är hela förklaringen till ordet "fortfarande".
3. **Att slumpa om räcker inte när felet är strukturellt.** 8 omkast av hela banan gav ändå 4
   fickor på 10 rundor (och kostade 157 ms per runda). Att **ta bort det föremål som dämmer** går
   monotont mot noll — varje borttagning öppnar fältet och kan aldrig skapa en ny ficka.

**Nya sonder:** `_kilprobe.mjs` (läser spelets LEVANDE kroppar → lankanal, fickor, `--bild` ritar
fältet) · `_spelaflipper.mjs` (släpper kulan i ytterbanan, paddlarna orörda, fryst bana, armarna
**växelvis**: fastnade **83,3 % → 1,9 %**, median nertid **3 826 → 1 715 ms**).

**Commits:** `76dc0d1` fix(flipperspel) · `326d1c7` docs(ÅTGÄRDER #7)

**Öppet:** ägaren testar v1.144.0 på telefonen. Kvarstår i spelet: i ~1 varv av 12 kramar en dyna
ihop lankanalen till 58 px — **ingen ficka** (kulan studsar bara på dynan), medvetet lämnat.
I övrigt oförändrat läge: `pruttbad` §4 (perspektivet först) är enda kön med ägarens ord bakom sig,
nattkön står på **N6**.

## 2026-08-11 · v1.143.0 · Ägarens speltest i fyra vändor — sex punkter, och en regel som drogs tillbaka

**Byggt:** ägaren speltestade natt VI:s fem bygge. `hamburgerbygget`, `natskott-pa-stan`,
`kugghjulen` och `trollblandning` godkända; `pruttbad` "okej" men med fem nya önskemål (§4,
perspektivet först). Två buggar/punkter togs hela vägen.

| # | Punkt | Utfall |
|---|---|---|
| ÅTGÄRDER #5 | `trollblandning`: nyupptäckt ikon över en annan | **Två oberoende fel bakom samma bild.** (A) hällningens hemtween låser sitt målvärde vid START, och `_react` flyttar hyllan 0,22 s in i den 0,30 s långa resan → **16,0 px** fel. (B) hyllan var dimensionerad för 7 element men kan få **13 redan på nivå 1** → **22,3 px överlapp**. 16,0 → **0,0** och 22,3 → **0,0**. Ny sond `_hyllprobe.mjs`. |
| V10b / O2 | `flipperspel`: `studs`-optens första kund | Stolparna kör `{ isStatic: true, studs: 0.7 }`. **59,4 → 75,4 px** (+27 %), par 0,62 → 0,70, `check --studs` 50 → **49**. Ny sond `_flipperprobe.mjs`. |

**Lärdomen som är värd mest: den RÖRLIGA kroppens eget studstal är ett GOLV.** V10 slog fast att
parets regel är `max(A, B)`, men ingen hade läst den baklänges. `flipperspel`s kula bär **0,62**,
och därmed är `wall` 0,3/0,4 · `sling` 0,5 · `spinner` 0,55 · `flipper` 0,3 döda av ett **andra,
oberoende** skäl — de hade förlorat mot kulan även om `setStatic` aldrig nollat dem. Mätt som
kontroll: ett statiskt 0,5 ger 59,4 px hopp både nollat och väckt, **0,0 px skillnad**. Slutsatsen
gäller varje framtida kund i migreringslistan: **läs den rörliga kroppens tal FÖRST**; ligger ytans
tal under, är `studs` fel verktyg hur avsiktligt talet än ser ut.

**Två fel bakom en bild är ett eget mönster.** Ägarens rapport ("ikonen hamnade över en annan")
hade två orsaker som var för sig gav exakt samma bild. Sonden mätte dem **var för sig** från
början — hade den mätt "ligger ikoner på varandra?" hade en tween-fix sett grön ut och ägaren
sett samma sak igen. Räkna alltid om vad systemet MAX kan behöva: hyllan var byggd för 7 element,
och en enkel genomräkning av recepten gav 13.

**Fem raka sondfel på samma mätning — nytt rekord, och alla tysta.** Försöket att mäta en enskild
ytas studs inne i det *levande* spelet gav: (1) `b.position.y = …` flyttar inte kroppens hörn, så
kulan gick rakt igenom stolpen; (2) `_phys.update`-ackumulatorn körde fyra steg på en bildruta och
kulan landade 21 px inne i stolpen, som då separerades i sidled; (3) en avläsning per bildruta
missar en studs som varar tre steg; (4) apexhöjd från släpppunkten mättade i båda armarna; (5) en
liten rund stolpe sprider en stor kula. **Lösningen var att byta arena, inte att fila vidare:**
studskoefficienten mäts i en NAKEN fysikvärld (som `_studsprobe.mjs`), och webbläsaren används
bara till det den är bra på — att läsa spelets egna tal och kontrollera exit-säkerheten.

**Ägarbeslut som stängde två köpunkter:** `domino` behåller sitt `nSlots`-tak och startar om efter
max (**N11 struken**, ingen kamera), och telefonkollen av full bleed är **godkänd** — skärmen är
låst i landskap, så rotation mitt i spel kan inte uppstå.

### Andra halvan: ägaren spelade vidare och rapporterade fyra gånger till

| # | Punkt | Utfall |
|---|---|---|
| ÅTGÄRDER #6 | `flipperspel`: en stolpe blockerade nerfarten | **Regression från v1.138.0.** Kilregeln var symmetrisk, men sidorna är kulans väg NER och lanvägen stänger dem underifrån — en passage på 70–90 px är där en FICKA. Ny regel `GAP_LANE` (≥100 eller ≤46 mot vägg/lanväg). **5 107 → 0** trånga korridorer på 1 500 banor. |
| — | `flipperspel`: slumpad bana + mindre dynor | Ägarönskemål. Fyra handlagda uppsättningar med ±22 px jitter ersatta av äkta sampling. Dynorna 46 → 34 px radie, vilket är det som ger plats åt fler: minsta centrumavstånd `2r + 64` är 156 px vid r=46 men 132 vid r=34. Antalet 4,0 (nivå 1) → 6,6 (nivå 12), tak 7. Stolparna flyttades in i fältet — de satt på y=192, exakt kulans serverings-höjd, vilket är varför de var omöjliga att träffa. |
| — | **Regel tillbakadragen** | Utplaceringsregeln skrevs först in som **P0 för alla 73 spel** plus en åtgärdslista på 14. Ägaren: *"regeln gällde endast för flipperspelet."* P0-raden borttagen, listan struken, `lib/utplacering.js` omskrivet till ett VERKTYG med ett filhuvud som säger när det gäller. |
| V10b | `flipperspel`: dynornas studs | Ägaren gav fritt val. **Att bara väcka dem var fel** — dynan lägger redan på en egen impuls (`_kickOff`), och med en riktig studs ovanpå höll dynfältet kulan uppe. Fyra armar växelvis: väckt+full kick sämst i båda körningarna (7,6 %/3 · 9,5 %/3), **väckt + kick 1,2 bäst i båda** (24,0 %/5 · 29,2 %/9). Noll kick är också fel. |
| — | `trollblandning`: tvåradig hylla | P0 kräver 96 px träffyta + 24 px mellanrum = **120 px per plats**; hyllans 1030 px rymmer **9**, men spelet når **13 redan på nivå 1**. En rad upp till 9, två rader därefter. Mätt vid 13: 120,0 / 96,0 / 24,0 px — alla precis på kravet. Kitteln flyttades 400 → 352 eftersom elden stod där övre raden skulle ligga. |

**Sessionens dyraste lärdom: en beteendemätning kan ljuga tyst, och den gör det olika varje gång.**
Dynornas studs mättes fem gånger med tre olika resultat innan orsakerna hittades: kulan kan stå
**statisk** under firandets lyft (en arm gav 0,0 % / 0 besök), och **en studsigare dyna tänder
rundan fortare** så `_checkComplete` byggde en NY bana mitt i försöket och armarna jämfördes på
olika banor. Med `_total` spärrat, statiska rutor bortkastade och armarna växelvis blev
riktningen entydig. Före det gick samma mätning att läsa som vilket svar man ville ha.

**Näst dyraste: fem raka sondfel på EN mätning.** Försöket att mäta en enskild ytas studs inne i
det *levande* spelet gav: en direkt skrivning till `position` flyttar inte kroppens hörn (kulan
gick rakt igenom stolpen) · `_phys.update`-ackumulatorn kör upp till fem steg per bildruta
(kulan landade 21 px inne i stolpen) · en avläsning per bildruta missar en studs som varar tre
steg · apexhöjd från släpppunkten mättade i båda armarna · en liten rund stolpe sprider en stor
kula. **Lösningen var att byta arena, inte att fila vidare:** studskoefficienten mäts i en NAKEN
fysikvärld (som `_studsprobe.mjs`), och webbläsaren används bara till att läsa spelets egna tal.

**Tredje: girig utplacering packar SÄMRE än ren slump.** Ett nytt föremål som söker maximalt
avstånd hamnar i ett hörn och fragmenterar ytan. Nivå 12, snitt/tak: bäst-av-900 **3,4/5** ·
"bra nog" 1,25× **3,3/5** · ren dartkastning **6,6/7**.

**Nya sonder:** `_hyllprobe.mjs` (hyllans placering + P0-mått i 2D) · `_flipperprobe.mjs`
(studsytor i naken fysik + kommer kulan ner) · `_banprobe.mjs` (1 500 slumpade banor).
**Ny lib:** `src/lib/utplacering.js`.

**Commits (10):** `83e6bc7` fix(trollblandning) ÅTGÄRDER #5 · `22cda28` docs speltest + beslut ·
`43d71b4` feat(flipperspel) V10b:s första kund · `2bebe6c` docs sessionslogg ·
`bc67071` feat(flipperspel) slumpad bana + mindre dynor · `f42e012` fix(flipperspel) ÅTGÄRDER #6
sidornas fickor · `5054508` feat(P0) utplaceringsregeln (senare tillbakadragen) ·
`846149d` docs regeln gäller flipperspelet · `c4657cd` feat(flipperspel) dynornas studs + kick
1,2 · `982fa60` feat(trollblandning) tvåradig hylla

**Kontroll:** `npm run check` **0 fel / 0 varningar** · `npm run test:all` **72/72** (kört efter
lib-ändringen) · `test trollblandning` + `test flipperspel` gröna, alla skärmdumpar sedda ·
`_hyllprobe` alla gröna · `_flipperprobe` alla gröna · `_banprobe` alla gröna på 1 500 banor ·
`_idleprobe flipperspel` A/B mot HEAD (identiska 4) · röstkön tom · bygget serverat på tailnet.

**Öppet:** (1) **`pruttbad`s fem önskemål i §4** — perspektivet först (det går inte att se om
badet visas uppifrån eller från sidan), sedan propp + kran, tre schampoflaskor och en anka som
tränger undan vatten. Det är den enda kön med ägarens ord bakom sig. (2) `flipperspel`: ägaren
speltestar v1.143.0 — dynornas nya karaktär och att kulan fortfarande når paddlarna. (3)
`trollblandning`: ägaren speltestar tvåradigheten vid 10+ element. (4) Nattkön (`.claude/state/
nattkorning.md`) står på **N6** — gradienterna som är kvar + `rimLight`s första kund.

---

## 2026-08-10 (natt VI, varv 3) · v1.131.0 · Nattkön varv 3 — pågår

**Byggt:** nattkörningens `⬜`-kö uppifrån (`.claude/state/nattkorning.md`). Posten fylls på
under natten; se filens egen loggtabell för löpande läge.

| # | Punkt | Utfall |
|---|---|---|
| N1 | `_livprobe` röd på `trollblandning` | **Äkta fynd** — spelet hade inte ett enda `feedback.liv`. Trollkarlen + hyllans element andas nu, båda på en **inre behållare** eftersom gester/drag äger `y`. 0 → 5 objekt, 6,8 px, spridning 0,45. |
| — | `_dragprobe` larmade falskt på vägen | Sonden krävde DragControllers **opt-in**-skugga av alla. **10 av 15** dragspel hade falsklarmat. Lagad. |
| N2a | `kugghjulen` **dubbelhjul** | Nivå 8: ett hjul driver kedjan vidare OCH en fläkt. **Mesh-grafen behövde noll ändringar** — den var redan generaliserad. Grenen är en bonus utanför vinstvillkoret. `_grenprobe.mjs` (17 kontroller) vaktar. |
| N2b | `kugghjulen` **back-hjul** | **Punkten omformulerad, inte byggd** — den uppenbara byggnaden är matematiskt omöjlig (se nedan). Korsad rem utpekad som rätt väg och nedskriven i §4. |
| N3 | `pruttbad` får `vatska.js` | Riktiga **tvåldroppar** vid poppet (`tval`). 2 024 px netto, 60,6 fps under CPU ×6, dränerade till 0. **Fyra fel som talen dolde** — tre hittades av bilden. Ny sond `_tvalprobe.mjs`. LYFTPLAN B1: tre spel → **sex** (listan var inaktuell). |
| N5 | `natskott-pa-stan` får `rep.js` | Nätlinans egen verlet-solver borta (59 rader). Settlade lägen skiljer **1,2–2,4 px**, piskans sag-kurva ≤ 8,3 px, spänt läge 7,4 px. **Bytet tog bort en latent sprängning**: den gamla kopian saknade fartspärr och gav **110 450 px lina för en korda på 1 300** vid ett ryck + tappad bildruta. Nya sonder `_natlinaprobe.mjs` (bär den gamla solvern som referens) + `_linabild.mjs`. C5 `MeshRope` **struken** för det här spelet med skäl. |
| N4 | `hamburgerbygget` får `mjukkropp.js` | **Båda bröden** är nu mjuka kroppar. Underbullen bär stapelns tyngd (**8,4–10,3 px monoton sammantryckning**, bredd 224 → 229,5), hela stapeln sätter sig med den, locket får en impuls per lager. Tom burgare **oförändrad** (ritad kurva 224,0 × 50,0 mot gamla 224 × 50). Fyra fällor, alla gröna i `npm run test`. Nya sonder `_bullprobe.mjs` + `_stapelprobe.mjs`. `sapbubblor` **struken** ur B2 med mätning bakom sig. |

**Nattens första lärdom: den röda sonden var sondens eget fel — igen (femte gången).**
`_dragprobe` rapporterade `skugga NEJ` på `trollblandning`. Verifieringen mot HEAD (rulla undan
kvällens ändring, kör om) gav **identiska tal** — 12 px eftersläpning, 0,092 rad lutning, 4 barn
före/under/efter. Alltså inte en regression. Orsaken: `DragController`s `skugga` är **opt-in**
(`skugga = false`) med flit — hälften av spelen ritar en egen markskugga, och två skuggor som
glider isär under ett snabbt drag syns direkt. Sonden läser nu `g._drag._skugga` och kräver
skuggan bara av de fem spel som bett om en; `enkelt-pussel` (opt-in) mäter fortfarande
`ja (alpha 0.16)` och barn 7 → 8 → 7, så fyndvägen är orörd.

**Motsatsen gällde för `_livprobe`:** den var röd av rätt skäl. Regeln "verifiera röda sonder
mot HEAD först" avgör vilket av de två fallen man har — den avfärdar inte fynd, den sorterar dem.

**N2b: en köad punkt som inte gick att bygga som den var formulerad — och varför det är ett
resultat.** "Ett back-hjul som vänder en karusell" antog att ett extra hjul i ett gap vänder
riktningen. Spelets egen länkregel säger något annat, i två rader:
`factor[v] = factor[u] · (e.rem ? 1 : −1) · r_u/r_v`, alltså rem = `f_a · (r_a/r_b)` och
mellanhjul = `f_a · (−1)(r_a/r_x) · (−1)(r_x/r_b)` = **samma tal, samma tecken**. Två vändningar
tar ut varandra — ett mellanhjul vänder mot en *direkt kuggkontakt*, aldrig mot en rem. Och det
finns inget "utan"-läge att jämföra mot, för tas hjulet bort bryts kedjan. En vändning kräver
**två ömsesidigt uteslutande vägar med olika paritet**; den läsbara varianten är en **korsad
rem** (rak = samma håll, korsad = vänd, och X:et är det enda en tvååring faktiskt ser). Planen
ligger i `docs/games/kugghjulen.md` §4 med de två rörda funktionerna utpekade.

**Mönstret som återkom tre gånger i natt:** talen var gröna och **bilden** bar fyndet. Axeln
mellan grenhjul och fläkt var 44 px och fläktbladet (radie 38) täckte nästan hela den; sondens
första bild var helt täckt av appens splash; och `_grenprobe`s eget P0-kriterium var för strängt
(krävde 184 px mellan pinnar — men kugghjul MÅSTE röra varandra, kedjans egna pinnar ligger
132–150 px isär, och `DragController._narmastMal` väljer närmaste mål ändå).

**Sonderna var lika ofta fel som koden.** Tre av nattens fem sond-möten var sondens fel, inte
spelets: `_dragprobe` krävde en opt-in-funktion, `_grenprobe`s P0-krav var fel standard för ett
spel där hjul MÅSTE röra varandra, och `_vatskeprobe` rapporterade 232 913 "vätskepixlar" om en
vätska med noll partiklar. **Och två grönt-rapporterande mätningar var falska:** `_grenprobe`s
första bild var täckt av splashen, och `_tvalprobe`s första pixelmätning räknade badets skum som
tvål (avstånd² 3460 mot tröskeln 3600). Botemedlen som fungerade: verifiera mot HEAD, mät
**differentiellt** (samma yta med och utan lagret), och **öppna bilden**.

**Commits:** `103682c` fix(sond) `_dragprobe` opt-in-skugga · `eceb5bf` fix(trollblandning) N1 ·
`985020c` docs N1 · `1a26518` feat(kugghjulen) N2a dubbelhjul · `ed0209b` docs(kugghjulen) N2b
omformulerad · `4546ba9` feat(pruttbad) N3 tvålvatten

**Kontroll:** `npm run check` **0 fel / 0 varningar** · `npm run test:all` **72/72 gröna** ·
`_livprobe` · `_dragprobe` · `_grenprobe` 17/17 · `_tvalprobe` 10/10 · röstkön **tom** ·
arbetsträdet rent · backup körd. Enda loggfynden i sviten är den kända ⏸-posten
`saknat-ljudklipp` (MOSS-SoundEffect nere): `sapbubblor` ×9 · `bajs-och-kiss` ×3 ·
`kittla-figuren` ×1 · `peka-pa-kroppen` ×1.

**Öppet:** nattkön står på **N4** (fler `mjukkropp`-kunder).

---

## 2026-08-10 (sen natt V) · v1.130.0 · Småsakerna tömda — och två öppna buggar som båda bytte form

**Byggt:** 5 punkter, 5 commits. Kön var "småsaker + öppna ÅTGÄRDER".

| # | Punkt | Utfall |
|---|---|---|
| 1 | 3 repliker utan klipp | `npm run voice` — 3 made, 0 failed. Kön är **tom**. |
| 2 | `pizzabageriet` saknade `BLEED` | Sista spelet utan bleed. Vägg, väggljus, bänkskiva och golv slutade på 0/1280/720, så en bred telefon visade **ängen från `createScene('warm')`** runt bageriet. |
| 3 | `spindelnatet`s dagsljusbruna mark | Marken låg i `COLORS.brown` under en stjärnhimmel. Dras nu 55 % mot `night`-temats egen marktone. |
| 4 | ÅTGÄRDER **V14** | Hypotesen **mätt falsk**. Harnessen bär nu sin egen diagnos i stället. |
| 5 | ÅTGÄRDER **V10** | `{ isStatic: true, studs }` byggd och mätt. Migreringslistan syns i `check`. |

**Passets viktigaste händelse: V14:s hypotes höll inte för en mätning.** Raden hade stått i tre
svep på att `golvet-ar-lava` är svitens tyngsta montering (enda spelet med BÅDE `FluidWorld` OCH
full `createScene`) och att skärmdumpen därför hinner före första målade bildrutan. Ny sond
**`scripts/_montageprobe.mjs`** mäter kostnaden som längsta gapet mellan två `rAF` efter
navigeringen — `nav.go()` är asynkron, så en synkron mätning av anropet visar ~0 och säger
ingenting. Utfall över 72 spel, CPU 4× strypt, median av 3 varv: **`golvet-ar-lava` 16,8 ms =
svitens median**, alltså EN bildruta precis som 69 andra spel. De enda som sticker ut är
`pizzabageriet` (50,0 ms, 3,0×) och `hamburgerbygget` (33,4 ms, 2,0×) — och ingen av dem faller.
Dessutom tas skärmdumpen efter tryck, drag OCH 900 ms; monteringskostnad kunde aldrig ha
förklarat den. **Det som byggdes i stället för en fix på en död hypotes:** omtagningen höjd från
en till tre, en vakt för `webglcontextlost`/`webglcontextrestored` (en förlorad GL-kontext ger
en helt tom duk utan ett enda konsolfel), bevis samlade i SAMMA ögonblick som den tomma bilden
(gl-kontext, gl-händelser, barn på stage och i världen, dukens storlek, `visibilityState`), och
en varning `tom-bild-omtagen` som bär hela diagnosen i stället för tystnad. Vägen är
**självtestad** med `--tvinga-tom N`, inte hoppad — en diagnos ingen kört är en gissning till.

**V10 blev en opt-in, inte en global fix.** `{ isStatic: true, studs: 0.75 }` sätter restitution
efter `setStatic`, uppdaterar `_original` (en väckt kropp behåller studsen), loopar över `parts`
som matter själv, kläms till 0..1 och strippas ur matters options. Uppmätt: **4,7 → 143,3 px**
hopp, identiskt med den simulerade fixen. **50 tal i 19 spel är fortfarande nollade med flit** —
en global återställning hade väckt 25 kombinationer på en gång i handtrimmade spel. `npm run
check` skriver nu EN sammanfattningsrad (`-- --studs` ger listan), så kön är läsbar i stället
för tyst. Listan tvingade själv fram två gränsdragningar: `restitution: 0` räknas inte, och
raden säger *"medan kroppen är statisk"* — `kulbana:140` skapar spelets KULA statisk med 0,42
och får tillbaka talet ur `_original` när den väcks.

**Två gånger var gradientmappningen den tysta fällan.** Både `pizzabageriet` och `spindelnatet`
ville breddas åt alla håll, men `verticalFill`/`groundFill` mappas mot formens **bbox-höjd**: ett
topp- eller bottenbleed hade flyttat hela ljuset i den synliga bilden. Regeln som gäller
härefter: **bredda gradienten bara i sidled, och lägg helfärgade remsor i dess ytter-toner
ovanför och under.**

**Commits:** `4bd872d` röstklipp · `72f5932` pizzabageriet bleed · `cb2d368` spindelnatet
månbelyst · `891a088` harnessens tom-bild-diagnos + `_montageprobe.mjs` · `898803a` studs-opt-in

**Öppet:**
- **`studs` har ingen kund bland spelen.** Första kunden är ägarnära (kräver att man SPELAR
  spelet). Kandidater med uppenbar avsikt: `spindelhjalten` 1,0 · `rulla-bollen-hem` 0,92 ·
  `bowling` 0,75 · `flipperspel` 0,5–0,7. ⚠️ Läs koden först — flera lägger redan en EGEN impuls
  vid träff, och då blir en väckt restitution en dubblering, inte en fix.
- **V14b väntar på nästa träff.** Frekvensen är ~1 av 7 svep; två fulla svep i det här passet var
  rena. Nästa gång kommer fyndet med sin orsak.
- Oförändrat: **D2** `saknat-ljudklipp` (MOSS nere) · platthetsarbetet vid avtagande avkastning
  (`hamburgerbygget` 48 525 · `pizzabageriet` ugnsinsidan 50 656) · GitHub Pages · telefonkoll ·
  miljöstädningen (två vite-instanser).

## 2026-08-10 (sen natt IV) · v1.125.0 · Sonden som saknades — och ett fynd som slutade vandra

**Byggt:** 4 spel + 1 sond. Nivån som låg i förra postens `Öppet`.

| spel | störst före → efter | fältet |
|---|---|---|
| plask-i-vattnet | 57 525 → 30 283 | golvet |
| pizzabageriet | 60 494 → 50 656 | osten på pizzan |
| hamburgerbygget | 55 584 → 48 525 | ingrediensbrädan |
| pruttbad | 56 535 → fältet ute ur topp-3 | badkarets insida |

**Passets viktigaste händelse var att jag gissade fel och mätte mig ur det.** Jag antog att
`hamburgerbygget`s fält var kaklet, implementerade det, och talet rörde sig knappt
(55 584 → 53 821). Det är den stående signalen att hypotesen om PLATSEN är fel. I stället för
en tredje gissning skrevs **`scripts/_bbox.mjs`** (`429654d`): den skriver ut antal + bbox för
en exakt ton i en skärmdump. Svaret kom direkt — `73,630 → 1206,712`, alltså
ingrediensbrädan, som dessutom är EXAKT samma konstruktion som `pizzabageriet`s hylla, redan
tonad i ett tidigare pass. Kakel-ändringen backades.

`_plattprobe` säger VILKEN ton som är störst, aldrig VAR den ligger. Den luckan har nu kostat
två rundor rimligt resonemang två gånger (`pizzabageriet`s hyllplan förra svepet, det här).
Nu finns verktyget.

**`pizzabageriet`s ost visar var chokladkule-gränsen går.** `sphereFill` var fel på
`tvatta-djuret`s lerklumpar eftersom varje liten klump fick sin egen glansdager och massan
läste som godis. Här är det EN stor skiva med EN mjuk kupa, och då är samma verktyg rätt —
med dämpade tal och bred spridning. Skillnaden är antalet ljuskällor ögat måste läsa, inte
verktyget.

**Två ytor lämnades med mätt skäl:**
- **`natskott`s `#d2554f`** är spelarens egen röda nät-hand (`hud: 0xd94f4f` under biom-tinten)
  — ett förgrundsobjekt i riggfamiljen som redan är skuggat, inte en platt yta.
- **`pruttbad`s topptal STEG** (56 535 → 68 757) utan att något blivit sämre: badvattnet tog
  över platsen och det fältet mättes till **29 953 / 45 767 / 54 871 / 68 757 i fyra körningar
  utan kodändring** — vattennivån stiger under spelets gång.

**ÅTGÄRDER V14 skärpt: `tom-scen` slutade vandra.** Passet körde **åtta fulla svep** — sex
rena, två med `tom-scen`, och BÅDA på `golvet-ar-lava`. Med V14:s ursprungliga observation är
det tre av tre på samma spel, medan V12b:s signatur var att fyndet vandrade mellan spel. Det
är en skärpning, inte en motsägelse: `golvet-ar-lava` är svitens enda spel som BÅDE monterar
en `FluidWorld`/`FluidView` (filter, hundratals sprites) OCH en full `createScene` — den
tyngsta monteringen i sviten, precis vad "skärmdumpen hinner före första bildrutan"
förutsäger. **Uteslutet med kod, inte gissning:** spelet anropar `createScene` med
`ground: false` (`index.js:110`), så `scene.js`-markens toning (`6789698`) ligger inte i dess
kodväg. Förslag till stängning står i V14.

**Commits:** `429654d` _bbox.mjs · `924387f` hamburgerbygget · `0f609d7` pizzabageriet ·
`65556d9` plask-i-vattnet · `fb7d4bd` pruttbad · `5990bdd` docs + skärpt V14 ·
`4191e28` `_bbox.mjs` in i CLAUDE.md:s sondtabell

**Öppet:**
- **Platthetsarbetet har nått avtagande avkastning.** Appens topp är `trollblandning`s
  receptbokspanel (115 400, ska förbli platt); största ÅTGÄRDBARA fält är nu ~48 000 px, ner
  från 809 744 där svepet började. Kvar i listan: `hamburgerbygget` bänkskivan 48 525 ·
  `pizzabageriet` ugnsinsidan 50 656 · `natskott` handen 57 169 (riggfråga, lämnad).
  Nästa pass bör fråga om det fortfarande är rätt arbete innan det fortsätter.
- Oförändrat: **C1/V10** · **D2** `saknat-ljudklipp` (MOSS nere) · 3 repliker väntar på
  `/rost` · `spindelnatet`s dagsljusbruna mark under natthimmel · `pizzabageriet` saknar
  `BLEED`.

## 2026-08-10 (sen natt III) · v1.124.0 · Föremål, inte ytor — och en himmel som redan var en toning

**Byggt:** 6 spel, 6 commits. Nivån som låg listad i förra postens `Öppet`.

| spel | störst före → efter | fältet |
|---|---|---|
| kittla-figuren | 75 809 → 18 198 | figuren SJÄLV — ett föremål, inte en yta |
| natskott-pa-stan | 71 095 → 57 169 | himlen: åtta handrullade band → en toning |
| vilket-djur-later | 66 327 → 15 870 | brickorna |
| enhorningen-elvira | 57 734 → 23 721 | marken |
| pizzabageriet | 62 882 → 60 494 | golvet fixat, osten tog över |
| pruttbad | 61 880 → 56 535 | golvet fixat, badvattnet tog över |

**`natskott`s himmel var REDAN tänkt som en toning.** Den ritades bara som åtta handrullade
band à 60 px, och åtta steg är för grovt: varje band blev 1280×62 ≈ 79 000 px i en exakt ton.
En cachad `verticalFill` ger samma färgresa mjukt, i EN ritinstruktion i stället för åtta.
Värt att leta efter på fler ställen — en `for`-loop som lerpar mellan två färger ÄR en
gradient, bara med för få steg.

**⚠️ `kittla-figuren` fälldes TVÅ gånger av bilden, och båda felen var osynliga i mätningen:**

1. Första försöket tonade bara KROPPEN. Huvudet ritas på ett eget ställe (`p.headG`) och blev
   kvar platt — ett platt huvud på en rund kropp. Lärdomen är generell: när ett föremål byggs
   av delar i olika funktioner räcker det inte att tona den del man råkade hitta först.
2. Mörkningen 0,26 gjorde pastellrosan DAMMIG i stället för rund. Artfärgerna är pasteller,
   alltså exakt samma kalibreringsfälla som grusstigen i `a1bb4e0` — fast här på ett föremål i
   stället för en yta. Dämpad till 0,16.

**Två spel rörde knappt sitt topptal, och det är INTE ett misslyckande.** `pizzabageriet` och
`pruttbad` fick sina målfält fixade (`#b07a4a` respektive `#dfe7ea` ute ur topp-3), men nästa
platta sak tog över platsen — osten och badvattnet. Det står i commit-meddelandena så att
nästa pass inte läser det som att fixen inte tog.

**`tom-scen` i `golvet-ar-lava` — den kända transienten, men KONTROLLERAD, inte bortviftad.**
Fyndet landade i ett spel som inte rörts på hela passet. Kontrollen som gjordes:
- Spelet ensamt: **grönt 3/3.**
- Mekanismen: den dokumenterade destabiliseraren är gradienter som bakas PER MONTERING.
  `_buildChar()` körs en gång vid montering, inte per bildruta, och färgerna är få — alla nya
  fyllningar cachas per färg. Ingen bakning per montering.
- Frekvensen: **sex fulla svep under passet, fem rena.** ÅTGÄRDER V14 mätte transienten till
  ~1 per 7 svep, vilket stämmer.
- ⚠️ **Vad som INTE gjordes:** `_ab.sh` växelvis. Bevisen ovan är förenliga med transienten men
  är inte full attribuering. Vill man ha den, kör `_ab.sh` och läs BÅDA armarna.

**Commits:** `7c62404` kittla-figuren · `5267b0e` natskott-pa-stan · `5613a7b`
vilket-djur-later · `9e49103` enhorningen-elvira · `8d6b1a9` pizzabageriet · `745ff36` pruttbad

**Öppet:**
- **Nästa nivå:** `pizzabageriet` osten `#f3cd63` 60 494 · `pruttbad` badvattnet 56 535 ·
  `natskott-pa-stan` markisen `#d2554f` 57 169 · `plask-i-vattnet` hyllplanet 57 525 ·
  `hamburgerbygget` 55 584. Appens topp är fortfarande `trollblandning`s receptbokspanel
  (115 400), som ska förbli platt. Leta upp fältet i KODEN först.
- **Leta efter fler handrullade band.** `natskott`s himmel var en `for`-loop med `lerpColor`.
  Samma mönster kan finnas i andra kulisser och är billigt att laga.
- Oförändrat: **C1/V10** · **D2** `saknat-ljudklipp` (MOSS nere) · 3 repliker väntar på
  `/rost` · `spindelnatet`s dagsljusbruna mark under natthimmel · `pizzabageriet` saknar
  `BLEED`.

## 2026-08-10 (sen natt II) · v1.123.0 · Nästa platta nivå — och alfan som dämpar toningen

**Byggt:** 4 spel, 4 commits. Nivån som låg mätt men outredd i förra postens `Öppet`.

| spel | störst före → efter | fältet |
|---|---|---|
| studsa-ner | 115 361 → 12 739 | plinkobrädan, `COLORS.cream` @ 0,78 |
| bajs-och-kiss | 88 856 → 31 820 | badrumsgolvet, rent `0xeaf2f5` |
| kugghjulen | 83 792 → 16 993 | pegbrädan, `COLORS.brown` @ 0,16 |
| plask-i-vattnet | 80 950 → 57 525 | vattenkroppen, `0x4aa3df` @ 0,45 |

**Fyra av fem fält behövde alpha-vägen** i `groundFill` — den option som byggdes för
`valpens-bajs` grusstig i v1.120.0. Den betalade av sig direkt: utan den hade tre av de fyra
fått välja mellan volym och genomskinlighet.

**NY KALIBRERINGSREGEL, mätt i `kugghjulen`.** Brädan är brun men ligger på `alpha: 0.16`, så
den SYNLIGA kontrasten blir rampen **gånger** alfan. Standardvärdena (0,14/0,28) hade släppt
igenom en dryg tiondel av sitt spann och knappt rört talet. Regeln att bära med sig: *en
genomskinlig yta behöver en hårdare ramp än en täckande för samma verkan* (här 0,25/0,45).

⚠️ **En felaktig slutsats rättades före commit.** Kommentaren påstod först att fältet inte
GICK att ta ner lika mycket som en täckande yta, med en uträkning som gav ~300 nödvändiga
RGB-steg mot 255 möjliga. Mätningen gav 16 993 och motsade det — uträkningen antog en jämn
bakgrund, men scenen bakom brädan har egen variation som sprider kompositen bredare. Räkna
gärna först, men låt mätningen vinna.

**`plask-i-vattnet` är det enda fallet där toningen var FYSIK, inte kosmetik.** Vatten mörknar
med djupet, så ljust vid ytan och mörkare mot botten är vad ögat väntar sig av en tank —
rampen fick därför vara tydligare (0,14/0,34) än på en torr yta.

**`snobollen` mättes och lämnades MED FLIT.** Dess ~82 000 px visade sig vara *ett band i en
redan avsiktlig sexbands-djupgradient* (`_paintHill:354–360`): `mix(1)`, solbelyst snöyta,
60 px hög. Blåst vit snö i direkt sol är rätt, och en toning inom ett 60 px-band syns inte.
Att leta upp fältet i koden först är vad som gjorde det synligt — talet ensamt hade sett ut
som ett femte jobb.

**Commits:** `054e424` studsa-ner · `f16b2ef` bajs-och-kiss · `e06a2bf` kugghjulen ·
`59e0778` plask-i-vattnet

`npm run check` grön · `npm run test:all` **72/72 gröna, inga `tom-scen`** (bara de kända
`saknat-ljudklipp`, D2/MOSS).

**Öppet:**
- **Appens största platta fält är nu 115 400 px — och det är receptbokens PANEL i
  `trollblandning`, som ska förbli platt.** Det största fält som faktiskt är i spel ligger på
  ~76 000. Nästa nivå: `kittla-figuren` 75 809 (figurens EGEN kropp — ett föremål, inte en yta)
  · `natskott-pa-stan` 71 095 (himlen) · `vilket-djur-later` 66 327 · `pizzabageriet` 62 882 ·
  `pruttbad` 61 880 · `enhorningen-elvira` 57 734. Leta upp fältet i KODEN först.
- ⚠️ **Mätbruset är nu bekräftat på två spel:** `snobollen` och `kittla-figuren` byter
  topptonens IDENTITET mellan körningar utan kodändring (väderljus respektive figurfärg).
  `snobollen` mättes till `#ffffff` 82 592 och `#d1b7c3` 76 202 i två körningar.
- Oförändrat: **C1/V10** · **D2** `saknat-ljudklipp` (MOSS nere) · 3 repliker väntar på
  `/rost` · `spindelnatet`s dagsljusbruna mark under natthimmel · `pizzabageriet` saknar
  `BLEED`.

## 2026-08-10 (sen natt) · v1.122.0 · Marken i `scene.js` — och två spel som inte rördes av den

Förra postens `Öppet` pekade ut `scene.js`-marken som nästa mål och sa: *mät innan något
rörs*. Det var rätt instinkt av två skäl — ett väntat och ett inte.

**Byggt:** scenens markremsa tonad för ALLA spel som ber om mark, plus två spel som visade
sig rita sitt eget golv.

`scene.js:176` ritade `.fill(t.ground)` — en platt ton delad av varje `createScene`-spel med
mark. Himlen ovanför var redan tonad via `skyFill`; marken var inte. Nu är remsan ljusast
LÄNGST BORT och mörknar mot betraktaren.

**Den mörka änden är temats EGNA `groundDark`, inte en procentsats.** Det löser
kalibreringsproblemet från grusstigen (v1.120.0) i grunden: `candy` och `warm` är nästan
vita, `night` nästan svart, och samma procentuella mörkning äter helt olika mycket av dem.
Paletten bär toningen själv, precis som `paintBand` redan gör för djupbanden. Alla sju teman
granskade i ett rutnät (`_scenbild.mjs sky,meadow,sunset,candy,water,night,warm`) — inget
tema tappade sin karaktär.

Toningen delar `skyFill`s cache med flit: en gradient från A till B är samma bakade textur
oavsett vad den målar, så en scen gör fortfarande NOLL texturbakningar vid montering.

**Det oväntade: två av tre spel rörde sig inte en pixel.**

| spel | störst före → efter | var fältet faktiskt låg |
|---|---|---|
| valpens-bajs | 95 225 → 18 069 | `scene.js`-marken (`groundH: 420`, appens högsta remsa) |
| studsbollar | 70 290 → 20 372 | eget golv — `ground: false` + hårdkodad `0x86d27a` |
| domino | 55 343 → 15 695 | eget golv — `ground: false` + `COLORS.green` |

`studsbollar` och `domino` skickar `ground: false` till `createScene` och ritar sina egna
golv. `studsbollar` gör det med `0x86d27a` — **samma värde som `meadow`s `ground`, alltså en
kopia av en scenkonstant.** Måttet var identiskt före och efter scenändringen, och det var
det som avslöjade var fältet låg. Hade talet lästs som "fixen fungerade delvis" hade två spel
missats. Det är samma stående lärdom som redan står i `pizzabageriet`s post: **när ett tal
INTE rör sig av en ändring som borde träffa det, är hypotesen om VAR fältet ligger fel.**
Båda golven löstes sedan med den delade `groundFill()`.

**Commits:** `6789698` scene.js-marken · `ec9a241` studsbollar · `30e2e77` domino

`npm run check` grön · `npm run test:all` **72/72 gröna, inga `tom-scen`**, körd både efter
scenändringen och efter hela bunten. Det är den mätning `scene.js` kräver: filen är den
sviten är känsligast för, och cachade gradienter är den ändringsklass som fällt den förut.

**Öppet:**
- **Nästa platta nivå ligger mätt** (`_plattprobe --medbakgrund`): `trollblandning` 115 397
  (receptbokens panel — lämnad med flit) · `studsa-ner` 115 361 · `bajs-och-kiss` 88 856 ·
  `kugghjulen` 83 792 · `snobollen` 82 592 · `plask-i-vattnet` 80 950. Ingen av dem är
  utredd än — leta upp fältet i KODEN först, det var det som gjorde de två senaste passen
  billiga.
- ⚠️ **Mätbrus att räkna med:** spel med slumpat innehåll rör sitt topptal mellan körningar
  utan att koden ändrats (`valpens-bajs` ±11 k beroende på om hunden står på gräset eller
  stigen; `kittla-figuren` byter topptonens IDENTITET med figurens färg). Jämför alltid samma
  fält, inte bara samma tal.
- Oförändrat: **C1/V10** · **D2** `saknat-ljudklipp` (MOSS nere) · 3 repliker väntar på
  `/rost` · `spindelnatet`s dagsljusbruna mark under natthimmel · `pizzabageriet` saknar
  `BLEED`.

## 2026-08-10 (natt) · v1.121.0 · D1-nivån stängd — ett mönster, inte sex engångsfixar

Förra passets `Öppet` pekade ut nästa nivå och en observation: *`#8a5a3b` (`COLORS.brown`)
toppar tre av dem — värt att angripa som ett delat mönster en gång i stället för sex.*
Det visade sig stämma, men inte på det sätt raden gissade: de sex spelen bar **två** olika
platthetsmönster, och det gick bara att se genom att lokalisera varje fält i koden först.

**Byggt:** 7 spel i 4 commits, hela den mätta D1-nivån.

| spel | störst före → efter | mönster |
|---|---|---|
| tvatta-djuret | 111 592 → 25 394 | B — många föremål i en ton |
| valpens-bajs (grusstigen) | 108 064 → ute ur topp-3 | A — plan med alpha |
| natskott-pa-stan | 105 360 → 71 816 | B — många föremål i en ton |
| saftbaren | 99 676 → 34 726 | A — stor vågrät plan |
| bygg-tornet | 94 613 → 18 796 | A — stor vågrät plan |
| spindelnatet | 73 096 → 22 847 | A — stor vågrät plan |
| trollblandning (hyllan) | 70 560 → 24 148 | A — stor vågrät plan |

**Mönster A — en stor vågrät yta ritad som en platt rect.** Mark, golv, bänkskiva, hylla.
Fanns redan handskrivet på ÅTTA ställen i repot (`golvet-ar-lava` ×2, `plantera-fron` ×2,
`bowling`, `lagerelden`, `vart-tog-det-vagen`, `mata-monstret`) med ljus topp ~0,14 och mörk
botten ~0,28. Det mönstret fick ett namn: **`groundFill(color, {light, dark, alpha})`** i
`lib/form.js`. `alpha < 1` routar till `verticalFillAlpha`, eftersom en yta som ska släppa
igenom det som ligger under (grusstigen över gräset) annars måste välja mellan volym och
genomskinlighet.

**Mönster B — många föremål som delar EN ton.** Inte en plan alls. Hyreshusens fasader
(`CITY_WALLS[0]` på flera hus) och lerfläckarna på djuret. Receptet är `topLightFill` per
föremål: den cachar per färg, så N föremål kostar EN gradient, inte en per föremål.

**Två gånger av sju sa mätningen "succé" och bilden sa nej.** Det är passets viktigaste
resultat och står nu i både `lib/form.js` och commit-meddelandena:

- **Grusstigen blev en lerpöl.** `groundFill`s standardvärden 0,14/0,28 är kalibrerade för
  MELLANMÖRKA ytor. Samma 28 % mörkning på stigens nästan vita `0xeadfc2` åt ett mycket
  större absolut spann och gjorde den grumligt gråbrun i stället för sandig. `_plattprobe`
  gav ett utmärkt tal ändå. Ljusa ytor vill ha ~0,07/0,11.
- **Leran blev chokladkulor.** `sphereFill` gav varje bump en egen glansdager, och tre klot
  per fläck läste som en hög godis på grisen. Talet var 111 592 → 30 048, alltså utmärkt.
  Lera vill ha låg inre kontrast och ljus uppifrån — `topLightFill` med dämpad ramp.

**En blockerare som var värd att fixa först.** `tvatta-djuret` satte
`view.rotation = Math.random() * Math.PI` per fläck, och en roterad Graphics roterar även
sin fyllning — varje fläck hade fått sin egen slumpmässiga ljusriktning. Slumpen flyttades
till bumparnas koordinater; siluetten är matematiskt identisk (samma vinkel, samma punkter,
huvudcirkeln i origo). **Gratis bugfix:** `klibb`-fläckarnas glansdager och rinnande droppe
följde tidigare den slumpade rotationen, så droppen kunde rinna rakt uppåt. Nu står de rätt.

**Sviten mätt, inte antagen.** Cachade gradienter i sju spel är precis den ändringsklass som
fällt sviten förut (`generateTexture`, `FillGradient` per montering). `npm run test:all`:
**72/72 gröna, inga `tom-scen`**, bara de fyra kända `saknat-ljudklipp` (D2, MOSS nere).

**Commits:** `b3cde53` markfyllningen + 4 spel · `a1bb4e0` valpens-bajs + alpha ·
`a4fb24e` natskott-pa-stan · `620895f` tvatta-djuret

**Öppet:**
- **Två nya mål föll ut ur arbetet**, inget av dem hörde till D1-nivån:
  1. **`scene.js`-marken.** `valpens-bajs` topp är nu `meadow`-gräset (`#86d27a`, 95 225 px)
     och `natskott-pa-stan`s är himlen (`#a6d8f2`, 71 816 px) — båda ur scenen, inte ur
     spelet. App-brett mål som träffar varje spel med stort `groundH`, och `lib/form.js`
     kallar `scene.js` "den fil sviten är känsligast för". Kräver egen mätning.
  2. **`spindelnatet`s mark är dagsljusbrun under natthimmel.** Färgfråga, inte platthet —
     medvetet inte insmuget i en D1-commit.
- **Lämnat platt med flit:** `trollblandning`s receptbokssida (115 403 px). Panel med text;
  `_plattprobe`s eget filhuvud varnar för att "fixa" panelen, ritpappret och fotbollsplanen.
- Oförändrat sedan tidigare: **C1/V10** (vilka `restitution`-tal är avsiktliga — kräver att
  man SPELAR spelen), **D2** `saknat-ljudklipp` (MOSS nere), 3 repliker väntar på `/rost`.
- **`pizzabageriet` använder inte `BLEED` någonstans** — hör till full bleed-spåret, inte D1.

## 2026-08-10 (kväll) · v1.118.0 · D1 repo-brett: 20 spel, tre nivåer — och en ny primitiv

Förra passets `Öppet` var en rad: *kör `_plattprobe --medbakgrund --topp 72` över hela
sviten*. Den kördes, och den bekräftade `COLORS.bg`-förutsägelsen hårdare än väntat.

**Byggt:** 20 spel i tre mätstyrda nivåer, en commit per spel, plus en delad hjälpare.
**Appens värsta platta fält gick 809 744 px → 115 402 px (88 % → 12,5 % av skärmen.)**

| nivå | spel | störst före → efter |
|---|---|---|
| 1 (v1.98–1.107) | vad-forsvann · siffertaget · kla-efter-vadret · harma-melodin · vart-tog-det-vagen · plantera-fron · tarta-i-ansiktet · enkelt-pussel · djurorkester · hamburgerbygget | 809 744 → 31 545 (värsta) |
| 2 (v1.108–1.113) | flipperspel · pruttbad · rakna-applen · pizzabageriet · spindel-zacke-svingar | 295 453 → 54 964 (värsta) |
| 3 (v1.114–1.118) | golvet-ar-lava · bowling · lagerelden · vandkort · mata-monstret | 163 026 → 24 881 (värsta) |

Per-spels-detaljerna står i `docs/games/<id>.md` §5 — alla 20 har fått en post med
före/efter-tal och skälet till just den lösningen.

**Fyra spel ritade ingen bakgrund ALLS** (`vad-forsvann`, `enkelt-pussel`,
`tarta-i-ansiktet`, `vart-tog-det-vagen`) — de låg direkt i skalets letterbox-creme. Det
var alltså inte platthet utan en saknad scen, och `bildkoll`s kant-cream-mätning kan
dessutom inte skilja en sådan scen från "ingen bleed alls".

**Ny delad primitiv: `verticalFillAlpha` (`lib/form.js`, `7cfdd87`).** `.fill({color,
alpha})` och `.fill(gradient)` utesluter varandra i Pixi v8, så varje yta som behöver
BÅDE genomskinlighet och volym var låst — det stoppade tre separata fixar. Vägen runt
ligger i STOPPEN: `addColorStop` kör dem genom `Color.toHexa()`, så `'#rrggbbaa'` är ett
giltigt färgstopp och toningen bär alfan själv. Den har **medvetet ingen
`_detalj`-avstängning**: övriga fyllningar får falla tillbaka på råfärgen på låg
detaljnivå eftersom bara volymen går förlorad, men här skulle en råfärg göra ytan HELT
TÄCKANDE — badvattnet skulle dölja Zacke. Att tappa volym är kosmetiskt; att tappa alfan
är en bugg. Kunder: `pruttbad` (vatten), `pizzabageriet` (hylla),
`spindel-zacke-svingar` (husväggar), `vandkort` (kortens innerplatta).

### Fyra lärdomar som är värda mer än fixarna

1. **Att fixa bakgrunden flyttar bara fyndet ett lager in.** Varje spels nya toppfält var
   nästa platta sak: ridån efter cirkusfonden, pusselbilden efter bordet, matjordskanten
   efter himlen, och i `mata-monstret` **monstret självt** (97 405 px). Räkna med två pass
   per spel, inte ett.
2. **Sonden räknar FÄRG, inte sammanhängande ytor — och hade rätt ändå.** `hamburgerbygget`s
   kaklade vägg bryter upp för ögat, men varje ruta hade exakt samma ton, så väggen saknade
   ljus helt.
3. **När ett tal inte RÖR SIG av en ändring som borde påverka det är hypotesen om VAR fältet
   sitter fel.** I `pizzabageriet` var jag säker på kaklet; jag ändrade väggens ljus och talet
   stod stilla på 85 558. En pixelräkning gav bbox 72,622 → 1207,713 — ingredienshyllan. En
   rad node slog två rundor av rimligt resonemang.
4. **Stoppsignalen är att största fältet blir ett riktigt FÖREMÅL** (en filt, en kopp, en
   kulle, ett kort) — bättre än någon px-tröskel.

### Tre saker backades efter att ha setts i bild (gröna test såg inget)

- Konsoler under `vad-forsvann`s hyllplan lästes som en vimpel som hängde under plankan.
- Ett första golv i samma spel lästes som en gul rand tvärs över bilden.
- `bowling`s bana mörknad med `shade()` blev **grå** — djupet fanns men värmen försvann.
  `lerpColor` mot banans egen markeringsfärg ger *samma tal* men läser som polerat trä i
  skugga. Bara bilden skiljde dem åt.

Ett motiv lämnades **medvetet platt**: `enkelt-pussel`s `regnbage` hålkar ur sina bågar
genom att måla om i exakt himlens ton, och en `FillGradient` mappas mot varje forms EGEN
bbox — hålet hade blivit en synlig skiva i fel färg. Skälet står i koden.

**Commits (21):** `8c8ef70` `ec8ee2b` `004232f` `ea3654c` `30da536` `e88ec63` `0e75b57`
`4494a51` `3a31d59` `526fafb` (nivå 1) · `374734a` `e65b2ef` `9e007f4` `7cfdd87` `bf5f3e4`
`00f3c1b` (nivå 2 + form.js) · `022999d` `4b00a8c` `f254093` `8809aa0` `566e63a` (nivå 3)
· `112ad69` (ÅTGÄRDER V14).

**Kontroll:** `npm run check` 0 fel/0 varningar · `npm run test:all` **72/72 gröna** efter
varje nivå · alla 20 spel var ✅/✅ i indexet före och efter (ingen statusändring).

### `tom-scen` återkom — och mättes i stället för att tolkas

Ett fullt svep loggade `tom-scen ×1` på `golvet-ar-lava`. ÅTGÄRDER **V12b** påstod att
harness-fixen tagit det till noll. **Det stämmer inte.** Mätt: spelet rent 3 av 3 ensamt,
och `scripts/_ab.sh` 3 rundor växelvis över hela sviten mot nivå 3:s fem filer gav
**HEAD (ny kod) 72/72 rent 3 av 3 · ÄNDRING (gammal kod) 72/72 rent 3 av 3** — sex fulla
svep, noll fynd i någon arm. Alltså varken attribuerbart till ändringen eller
reproducerbart på begäran; frekvensen är ~1 av 7 fulla svep. Skrivet som **V14** i
`docs/ATGARDER.md`. Att BÅDA armarna mättes är poängen — hade bara min arm mätts kunde
tystnaden lika gärna ha varit tur.

⚠️ **Fälla värd att minnas:** direkt efter ett `_ab.sh`-svep är `.test-shots` bilder från
den arm som kördes SIST (den gamla koden), så `_plattprobe` rapporterar för-fix-talen och
ser ut som en regression. Kör om `npm run test <id>` före mätning. Kostade ett falsklarm.

**Öppet:**
- **Nästa D1-nivå ligger mätt:** `trollblandning` 115 402 · `tvatta-djuret` 111 592 ·
  `valpens-bajs` 108 064 · `natskott-pa-stan` 105 360 · `saftbaren` 99 676 · `bygg-tornet`
  94 613. `#8a5a3b` (`COLORS.brown`) toppar **tre** av dem — värt att angripa som ett delat
  mönster en gång i stället för sex.
- **`pizzabageriet` använder inte `BLEED` någonstans** (väggen ritas `rect(0, 0, W,
  COUNTER_Y)`). Sett men inte åtgärdat — det hör till full bleed-spåret, inte D1, och skulle
  ha grumlat en platthetscommit. Kontrollera med `--viewport 952x428`.
- Oförändrat sedan tidigare: **C1/V10** (vilka `restitution`-tal är avsiktliga — kräver att
  man SPELAR spelen), **D2** `saknat-ljudklipp` (MOSS nere), 3 repliker väntar på `/rost`.

---

## 2026-08-10 (eftermiddag) · v1.97.0 · D1: tre platta ytor — och sonden som rankade dem fel

**Autonom fortsättning** på nattkörningens kö, punkt **D1** (platta ytor). Tre spel, en
commit var, djup och ljus i stället för fler föremål.

**Byggt:** alla tre stora enfärgade fälten brutna med cachade linjära gradienter
(`verticalFill`, lib/form.js — noll texturbakningar per montering). Varje gradient spänner
OM den ton ytan hade, så bilden är densamma; det är bara ljuset som tillkommit.

| spel | före | efter | |
|---|---|---|---|
| `folj-sparet` | 595 215 px (65 %) | 53 848 px (5,8 %) | 11,1× |
| `spara-linjen` | 342 352 px (37 %) | 49 444 px (5,4 %) | 6,9× |
| `rulla-bollen-hem` | 236 489 px (26 %) | 44 727 px (4,9 %) | 5,3× |

**Sonden rankade uppgiften fel, och det är sessionens viktigaste fynd.** `_plattprobe`
räknar bort exakt EN ton som "bakgrund". I `folj-sparet` var den borträknade tonen **ängen
själv**, så spelet såg minst ut (24 %) medan det i verkligheten var värst: äng 65 % + ram
24 % = **89 % av skärmen i två toner**. Samma blindfläck ger dessutom **falska
regressioner**: tonar man just den borträknade ytan — vilket är den rätta åtgärden —
krymper avdraget och talet STIGER. `rulla-bollen-hem` gick 29 317 → 38 718 av en korrekt
bakgrundsgradient medan den verkliga ytan samtidigt föll 258 619 → 38 718. Jag var nära att
backa en korrekt fix på det talet. Sonden har nu flaggan **`--medbakgrund`**, utskriften
säger vilket läge den kör i, och blindfläcken står i filhuvudet.

**Mönstret som upprepades i alla tre spelen:** så fort huvudytan slutar vara platt blir
RAMEN runt den spelets största fält. Två av tre ritade ingen egen bakgrund alls utan lutade
sig mot skalets `COLORS.bg` — en enda ton över hela skärmen. **En D1-fix är inte klar förrän
spelet äger sin egen yta.** `spara-linjen`s filhuvud hade dessutom hela tiden påstått att
scenen är "ett skrivbord med papper och kritor"; något bord ritades aldrig.

**Avvägning värd att minnas:** papprets toning är medvetet mycket svagare än fotbollsplanens.
Sondens filhuvud kallar ett vitt ritpapper legitimt platt, och det stämmer så länge det ser
ut som papper — barnets kritstreck är innehållet, och arket får aldrig konkurrera med det.

**Commits:** `0c03928` rulla-bollen-hem · `3e239b4` spara-linjen · `fd9df54` folj-sparet

**`test:all` 72/72 gröna — noll `tom-scen`, noll `gles-scen`, noll fel-nivåfynd.** Värt att
notera: fyra nya gradienter destabiliserade INTE sviten, vilket är den historiskt farliga
ändringen (`new FillGradient` per montering gav `tom-scen` i 1 av 3 rundor). De är cachade
per färgpar, så en montering gör noll texturbakningar. Enda varningar: `saknat-ljudklipp` i
tre spel (MOSS-beroende, D2).

**Öppet:** kör `_plattprobe --medbakgrund --topp 72` över hela sviten — det är nu ett annat
mått än ranklistan, och `COLORS.bg`-mönstret finns troligen i fler spel.

## 2026-08-10 (eftermiddag) · v1.94.0 · Poler i magnetdammen — och gränsen som var beslutet

**Autonom fortsättning** på nattkörningens kö (`.claude/state/nattkorning.md`), punkt **B3**
— sista maskinpunkten i Spår 3 P3.

**Byggt:** `lib/magnet.js` fick `polaritet` + `polDra(body, pol)`. Pol 0 = omagnetiserat
järn och dras av BÅDA polerna; pol ±1 = en egen magnet där lika stöter bort och olika drar.
Returvärdet är signerat, så tecknet ÄR villkoret spelet läser. I `magnet-fiske`: från nivå 2
byts en vanlig metallsak mot en röd och en blå stavmagnet, magnethuvudet bär den aktiva
polens färg, och en vänd-knapp (Ø112 px) visar den färg magneten BLIR.

**Det som var värt mest var inte fysiken utan gränsdragningen.** Kötexten var en rad utan
analys, och spelet är appens yngsta (2–4 år): en polregel lägger ett VILLKOR i kärnloopen.
Polerna är därför grindade på **nivå ≥ 2** och nivå 0–1 är bevisat orörd — ingen knapp,
ingen blå magnet, ingen vriden bild. Att vanlig metall dras av båda polerna är samtidigt
den riktiga fysiken och no-fail-garantin: dammen kan aldrig låsa sig.

**Ett mätt tal räddade leken.** Med samma radie åt båda håll pressades en bortstött sak
**315 px ut ur ett 300 px fält på 1,5 s** — utanför dragets räckvidd, alltså omöjlig att
vända hem om barnet inte råkade följa efter. Knuffen fick därför en egen, mindre radie
(`stotRadie` 170) och blev ett NÄRFÄLT: saken glider ut till knuffkanten, stannar där, och
ligger fortfarande långt inne i dragets radie. Den fick också ett eget, lägre tak
(`stotFart` 7 mot dragets 14) — ett omvänt 1/r-fält är en katapult precis vid centrum.

**Sonden hade fel före koden, tre gånger till** — samma mönster som hela spåret. Två av dem
är nya klasser värda att minnas: en **hållen musknapp** som lämnats nedtryckt tvärs fyra
skärmbyten rev spelet mitt i nästa avsnitts mätning, och **`nav.go` som kommer medan routern
är `_busy` kastas TYST** (`Nav.js:32`) — sonden mätte hela tiden nivå 0 medan den trodde sig
mäta nivå 2, utan ett enda konsolfel. Den tredje var falskt grönt: jakten slutar med magneten
*på* saken (0,3 px), så "fångbar efter 0,0 s" bevisade bara att fastna-spärren släpper.

**Commits:** `c41d451` feat(magnet-fiske): poler fran niva 2 - lika farger knuffar bort

**Öppet:** Spår 3 P3 har bara §4 [Deep]-rester kvar (`kugghjulen` dubbelhjul + back-hjul).
Kön: **C1** (genomgången spel för spel av vilka `restitution`-tal som är avsiktliga — kräver
att man SPELAR spelen, ägarnära), **D1** (platta ytor, mätt och redo att byggas), **D2**
(`saknat-ljudklipp`, MOSS-beroende), **D3** ([Quick]-punkter ur `docs/games/*.md`).
3 nya repliker väntar på `/rost`.

## 2026-08-10 (förmiddag) · v1.93.0 · Hällningen och elden — plus två tysta buggar

**Autonom fortsättning** på nattkörningens kö (`.claude/state/nattkorning.md`), punkt **B2**.

### `trollblandning` — SPH i hällningen + `Varmefalt` i kitteln (`9ed62e8`)

Kön bad om `FLUIDS.gegga` + värme. **Koden lästes före planen** och geometrin sa nej till den
bokstavliga formen: kitteln har ingen vätskepelare sedd från sidan — brygden är en **ellips
sedd uppifrån** — så en `FluidWorld` i kitteln hade fallit till botten av en osynlig låda.
Vald väg: *simulera bara där vätskan syns*.

- **Hällningen.** Droppen flyger upp, **tippar**, och en SPH-stråle rinner ned i mynningen och
  slukas av ytan. Siktet är räknat, inte trimmat: falltiden hällpose→yta är ~18 bildrutor, så
  sidfarten är avståndet delat på den → träffpunkt **x=552** (mitten 560), fri från
  ingrediensringarna på 508/612.
- **Brygden är en äkta blandning.** En hällning = 43 partiklar = **53 %** mot elementets färg;
  två ingredienser landar **0,2 kanalsteg** från den uträknade mass-viktade blandningen och
  100 steg från ren eld — alltså inte "sista färgen vinner".
- **Elden.** Brygden kokar vid 0,92 och temperaturen driver bubbeltakt, kokglöd och ånga —
  **aldrig målet**. **Systemen möts i absorptionen:** partikeln bär både sin färg och sin
  värme in i brygden. Vatten i en kokande kittel: **0,93 → 0,40**, bubbeltakt **12,1 → 2,8/s**,
  elden tillbaka på **1,2 s**.
- **Delad kod:** `Varmefalt.knuff()` (`238fbd3`) — rör `temp`, aldrig `grad`. `lagerelden` orörd.

### Bilden ändrade koden fyra gånger, sonden hade fel två
Inget grönt mått såg att elden låg **helt** bakom grytkroppen (den slutar vid y=96), att
kokglöden sköljde bort brygdfärgen, att markglöden läste som en platt lila matta, eller att
två av fem lågor stod exakt bakom benen (|x| 40–78). Och två mått var falskt gröna av mig
själv: ett `waitForFunction` på "hällningen är slut" returnerade **omedelbart** (den börjar
först efter droppens 0,2 s uppflygning), och ett mått påstod att blått måste *sjunka* när eld
hälls i — medelvärdet av 223 och 107 är 165, alltså **högre** än det halvmättade vattnets 150.
**Båda upptäcktes för att talet var för snyggt: mätvärdet var identiskt med förutsägelsen.**

### Den femte vätskan var oskyldig — och HEAD var det inte
`test:all` gav 72/72 gröna men `tom-scen` på **tre orörda spel**. Misstanken var rimlig
(spelet lägger till en femte `FluidView`, och "ett filter i ETT spel fäller ett ANNAT" är
dokumenterat tre gånger). `_ab.sh` växelvis, 3 rundor: **HEAD 2 av 3 rena** (runda 2:
`fyrverkeri` + `glittergrottan`) mot **ändringen 3 av 3 rena**. Fynden **flyttar sig varje
svep** — det är V12b:s signatur: en rörlig måltavla hör till harnessen, inte till platsen.

### `magnet-fiske` — ankan fanns inte i dammen (`bd54a8f`)

Hittad genom att LÄSA koden före B3-planen, inte genom ett test. `korkPool` stod kvar med
emoji-strängar (`'🦆'`/`'🛟'`) sedan emoji→ritat-migreringen medan `makeThing()` matchar
sorts-id — okända namn faller igenom till sista grenen, så **varje icke-metall på nivå 0–2
ritades som en TRÄBÅT**. Spelets pedagogiska ankare, gummiankan, fanns inte förrän nivå 3.

**Varför det överlevde tio nivåer är lärdomen:** `MATERIAL` saknar också nyckeln och föll
tillbaka på `'Trä'` — vilket råkar vara **sant om en båt**. Rösten sa rätt sak om fel
föremål; testet var grönt och skärmdumpen såg trovärdig ut. Guard: `_magnetprobe` avsnitt
**C** bygger nivå 0–3 och kräver att varje sak heter något `makeThing` har en gren för.

### `ballonglyft` — auto-hjälpens replik klipptes av sin egen räkning (`f1da22c`)

Den öppna `opts`-buggen från A2. `_attachLoose` tog emot `{ auto: true }` och läste det
aldrig, så `_recue`s hjälpreplik och räkneordet sades i SAMMA tick — och `say()` inleder med
`cancel()`. **Uppmätt: hjälpklippet levde 0 ms på HEAD**; efter fixen en sändning med två
klipp och inget avbrott. Fixen är ingen timer: `_dispatch` kedjar redan flera meningar när
alla har klipp. Ny sond `_hjalpprobe.mjs` hookar `_playUrls`/`cancel` i den riktiga tjänsten
och mäter vad som SPELAS, inte vad som sägs — det är skillnaden mellan de två som var buggen.
**A2:s saknade kritikergranskning gjord i samma svep** (av mig, inte subagenten — sessionen
tillåter inte Agent-verktyget): `_lyftprobe` alla mått goda · `_tystprobe` 0 döda träffytor ·
`_idleprobe` 0.

### Ett fynd granskades och FÖRKASTADES
En sond visade att ballongbuketten överlappar Elviras balkong i alla lägen. Det är
geometrin, inte en bugg — paketet ska upp TILL balkongen — och sonden hade bara härlett
layouten igen. Ingen kod ändrades. **Tredje gången i det här repot en röd sond visat sig
vara det trasiga.**

**Commits (7):** `238fbd3` feat(varme) · `9ed62e8` feat(trollblandning) · `b0b07b3` docs ·
`bd54a8f` fix(magnet-fiske) · `aa5670e` docs · `eba7409` docs (stängde två föråldrade
listposter) · `f1da22c` fix(ballonglyft) · `d11dd4b` docs
**Kontroll:** `check` 0 fel · `_kittelprobe` 14/14 · `_varmeprobe` (+6) · `_hjalpprobe` 5/5
(verifierad RÖD på HEAD) · `_magnetprobe` C grön · `bildkoll` inga fynd · `test:all` 72/72 i
tre av tre A/B-armar · slutkoll `test` 3/3 gröna.
**Öppet — nästa naturliga steg:** **B3 `magnet-fiske` poler**, designen är redan beslutad och
nedskriven i `.claude/state/nattkorning.md` (grindad på nivå ≥ 2; vanlig metall dras av BÅDA
polerna så loopen aldrig kan blockeras; `Magnetfalt.polaritet` + `polDra()`; repulsionen
måste takas). Därefter: §4 [Deep] dubbelhjul + back-hjul i `kugghjulen` · D1 platta ytor
(mätt, obyggd) · D3 [Quick]-svep · ÅTGÄRDER V10 (kräver att man SPELAR spelen) · D2/MOSS.
Sidofynd: `_livprobe` är röd på `trollblandning` (noll objekt med vilorörelse) — egen
[Quick]-punkt, inte en regression.

---

## 2026-08-10 (morgon) · v1.90.0 · Remmen bär kraften över ett gap

**Autonom fortsättning** på nattkörningens kö (`.claude/state/nattkorning.md`), punkt B1.

### `kugghjulen` — drivremmen (`68d4c12`)

Kugghjul kan bara greppa granne mot granne, så maskinen har alltid varit en obruten rad.
Remmen är den **första delen som bryter det**: den kopplar två hjul som INTE rör varandra,
och gör det med **samma** rotationsriktning i stället för motsatt.

**Mesh-grafen är generaliserad.** Riktning och utväxling bärs nu av LÄNKEN, inte av djupets
paritet: kuggar vänder, remmen behåller, och båda för över ytfarten (ω_v = ω_u · r_u / r_v).
För en ren kuggkedja ger det *exakt* samma tal som förut — därför är alla nivåer utan rem
oförändrade, vilket också är verifierat i bild.

Ritad ur `lib/rep.js` (två verlet-spann + omslagsbågar), vilket ger gratis den enda egenskap
som gör en rem läsbar för ett barn: den **hänger slak** när ett hjul saknas och **spänns** i
samma stund den greppar. Nivå 5 bytte innehåll (tre hjul + gap), gamla femhjulsbygget är
nivå 6, nivå 7 kombinerar rem med lockpinnar. `_remprobe` 17 mått gröna.
`spelkritiker`: **klar att committa, inga blockerare** — två av tre förbättringar togs direkt.

### Lärdomen tillhör SONDEN och BILDEN, inte remmen
Två mått var falskt gröna av mig själv: ytfarten mättes över **två** bildrutor och jämfördes
mot **en**, dolt av en ±120 %-tolerans (nu ±20 %). Och första skärmdumpen visade en **annan
nivå i konfetti** — en tidigare mätarm hade vunnit nivån och `_onComplete`s `delayedCall`
byggde om scenen mitt under exponeringen. **Bilden ändrade koden två gånger** (omslagsbågar
helt dolda bakom hjullagret; slak rem som hängde från navet i stället för fälgen) — inget
grönt mått hade fångat något av det.

### `_vevprobe` är rött på HEAD → ÅTGÄRDER V13
Glappmåttet föll på **båda** armarna i en A/B samma minut (19°/23° vardera). Tröskeln är
bildrutetaktsberoende — samma kod mätte 12°/17° när `0da667d` skrevs. **Rör inte
`_stegMaskin` på det fyndet.**

**Öppet:** vevljudet hör inte tyngden (kritikerns tredje punkt, B1) · §4 [Deep] dubbelhjul +
back-hjul · P3: `trollblandning`, `magnet-fiske` · D1 platta ytor (mätt) · ÅTGÄRDER V10 +
V13 · MOSS-beroende `saknat-ljudklipp` i fyra spel.

---

## 2026-08-10 (natt) · v1.89.0 · Nattkörning: P2 klar, P3 inledd, sviten ren

**Autonom nattkörning** med kön i `.claude/state/nattkorning.md`. Sjutton commits.

### Runda P2 KLAR — fyra spel fick riktiga kraftfält
`plask-i-vattnet` (SPH-vatten) · `fallskarmen` (luftmotstånd + kupol som buktar) ·
`ballonglyft` (lyft mot vikt, barnet bestämmer när) · `sapbubblor` (hinnan ger efter för
vinden). Två nya delade primitiver: **`lib/luftmotstand.js`** och **`mjukkropp.falt()`**.

### `kugghjulen` — maskinen har tröghet (P3 inledd, v1.89.0 `3e2826c`)
Fingret sätter en önskad FART, bygget hinner dit så fort massan tillåter, och släpper barnet
rullar den vidare som ett svänghjul. Mätt: tom vev full fart efter **5 bildrutor**,
femhjulsbygge efter **36** · utrullning **9,42 rad mot 1,61**. Trögheten summeras över de
hjul som faktiskt greppar, så den är en avläsning av vad barnet byggt.

### Svitens `tom-scen`-brus var harnessens eget mätfel (`9e41417`)
Fyndet flyttade sig: `tvatta-djuret` två svep, sedan `flipperspel` och `folj-sparet`, medan
varje spel var grönt ensamt. Skärmdumpen togs efter en TIMER, så `page.screenshot()`
kapplöpte med WebGL-rutan och vann ibland under fyra parallella webbläsare. Nu väntar den på
två `requestAnimationFrame` + tar om bilden en gång om den ändå blev tom. **Före: fynd i
3 av 3 svep. Efter: 72/72 med noll fel-nivåfynd.**
⚠️ Lärdomen: *ett återkommande fynd på samma plats är inte bevis för att platsen är orsaken.*

### Röstkön var inte tom — den var osynlig (`dbc8f80`)
`plask-i-vattnet`s namngivning byggs vid körning, och backstoppen såg den aldrig: testet hann
säga två repliker på 6,2 s. Fraserna härleddes ur spelets egen tabell → **50 klipp, 0 fel**.

**Öppet:** `kugghjulen`s `rep.js`-drivband (ny mekanik, egen runda) · P3: `trollblandning`,
`magnet-fiske` · **D1 platta ytor är MÄTT**: `spara-linjen` 37 % av skärmen i en ton,
`rulla-bollen-hem` 48 % i två omärkbart olika gröna, `folj-sparet` 24 % · ÅTGÄRDER V10
(statisk restitution, 23 spel) · MOSS-beroende `saknat-ljudklipp` i fyra spel.

---

## 2026-08-10 (natt) · v1.87.0 · Spår 3 P2 — luften blev en kraft i två spel + röstkön tömd

**Byggt i en autonom nattkörning** (kön ligger i `.claude/state/nattkorning.md`, som är
sanningen mellan varven). Två spel, en ny delad primitiv, två kritikerrundor, 50 röstklipp.

### `ballonglyft` — barnet bestämmer när (v1.87.0, `303d2e8` + `e36d1f7`)

`lib/luftmotstand.js` andra kund. **Paketet är avfärdsknappen**: sitter minst en ballong på
det skickas det iväg vid tryck. Doc §4 föreslog en ritad "Skicka iväg!"-knapp — bortvald med
flit, eftersom P0 säger ikon-först och noll läsning, nederkanten redan är upptagen av de lösa
ballongernas två band, och paketet ÄR föremålet som ska iväg.

**Mätningen ändrade designen.** Första kravet var att "en för få" skulle ge ett hopp på
60–160 px för alla N. Det gick inte att uppfylla: underskottet vid n = N−1 är exakt g/N,
alltså 33 % vid tre ballonger men bara **12 % vid åtta**. Varje inställning som gav ett kort
hopp vid N = 8 tog 7,5 s vid N = 3 eller lät sju ballonger lyfta ett åtta-paket. Det är
geometrin i problemet — och nära-misset blev BÄTTRE av att skala: två av tre lyfter knappt
(64 px), sju av åtta vänder 64 px under Elvira. **Räddningen föll ut gratis:** fäster barnet
sista ballongen mitt i en resa som håller på att vända, så räddas den.

**`spelkritiker` hittade två blockerare, båda mina:**
1. **Auto-hjälpen skickade iväg paketet åt barnet** efter 12,5 s — och gav bort exakt den
   agens rundan lades till för. Uppmätt: noll tryck gav ändå **framsteg 2 på 60 s**. Nu
   upprepas lockandet i stället. Efter: `idleFramsteg` 0, spelet fortfarande lösbart.
2. **P0-avståndet mellan träffytor höll inte** vid åtta ballonger: 111 px mellan mitterna mot
   en 104 px träffyta = **7,4 px glapp** (krav ≥24). Och inte i ett hörn — `_N` fastnar på 8
   från nivå ~6, så det var spelets normala läge. Banden breddade: nu 130 px och **26 px
   glapp**, med mätningen kvar som permanent vakt i `_lyftprobe --spel`.

### Röstkön var inte tom — den var osynlig (`0910d20` + `dbc8f80`)

`plask-i-vattnet`s namngivning ("Anden flyter!") byggs vid körning, så `check.mjs` kan aldrig
se den. Men **backstoppen såg den heller aldrig**: testkörningen hann bara säga två repliker
på 6,2 s. Fraserna härleddes därför ur spelets egen tabell — 16 föremål × fast utfall × tre
former = 48 repliker. `npm run voice`: **50 klipp gjorda, 0 misslyckade.**
⚠️ Samma blindfläck gäller de återstående **27 körningsbyggda replikerna** i andra spel.

---

## 2026-08-10 (natt) · v1.86.0 · Spår 3 P2 — fallskärmen fick riktig luft

**Byggt:** Andra kunden i runda P2, byggd i en autonom nattkörning (kön ligger i
`.claude/state/nattkorning.md`). Ny delad primitiv **`src/lib/luftmotstand.js`**
(`Motstandsvolym`) — motstånd mot farten *relativt luften*, och ur den enda lagen faller
gränsfarten, vindens grepp och styrningens tak ut av sig själva. `lib/mjukkropp.js` fick
**`falt(ax, ay)`** och kupolen blev dess fjärde kund.

**Vad HEAD faktiskt gjorde** (mätt med nya `scripts/_fallprobe.mjs`, inte gissat):
95 % av fallfarten nåddes efter **0,07 s** — ingen acceleration alls. Styrningen gav
**248 px (Lätt) mot 245 px (Tung)** på en sekund, alltså gjorde tyngdknappen ingenting åt
styrförmågan. Efter: Lätt 4,87 s / 75→82 px/s, Tung 2,97 s / 119→137 px/s, **kvot 1,67× =
exakt HEADs**, accelerationen syns (0,20 resp. 0,32 s), styrning 227/190 px.

**Fyra fällor, alla inskrivna som varningar i koden:**

1. **En acceleration och en kraft är inte samma sak.** Med styrningen som acceleration drev
   den TUNGA lasten *längre* i sidled än den lätta (65 mot 45 px) — samma acceleration,
   högre gränsfart. Därav `driv()` (spelets hjälp, massoberoende) och `kraft()` (barnets
   muskler, delas med massan).
2. **`skjut()` är en impuls, inte ett kraftfält.** Verlet läser en positionsändring som
   fart, så en `skjut` per bildruta blev en konstant FART och kupolen veks ihop till en
   sned trekant — med helt riktig fysik bakom sig.
3. **Med tre fästen roterade mjukkroppen** (toppunkten gled till x = −55, bredden 184 →
   209 px) och kraftfältet drunknade: lätt, tung och sidby gav identiska former på 0,1 px.
4. **`form(a)` skalar BÅDA axlarna**, så en platt underkant drog in skärmkantens hörn till
   ±11 px i stället för ±92.

**`spelkritiker`:** inga blockerare, alla sju grindpunkter håller. Domen värd att bära med:
*större delen av fysikrundans finess levde i sondens utskrift och inte på skärmen.* Tre
billiga fynd åtgärdade utan att röra kalibreringen — bukten överdrivs **×2,5 vid ritning**
(2,8 px är sant men osynligt på en platta), glödringen var en **full cirkel fast träffen är
rent vågrät** (läste som "flyg igenom ringen") och blev en liggande ellips, och **tyngden
hörs** nu (Tung 260→130 Hz, Lätt 420→760).

**Commits:** `1ff0d98` fysiken · `7690ccd` kupolen · `8e652a6` doc · `692707e` kritikfixar ·
`fca7efd` ÅTGÄRDER V12 · `5f7dd34` V11 stängd
**Kontroll:** `check` 0 fel · `test:all` **72/72 gröna** · `_motstandprobe` 17/17 ·
`_kupolprobe` 6/6 · `_mjukprobe`/`_vobbelprobe` gröna · mjukkroppens tre andra kunder gröna.
**Öppet:**
- **ÅTGÄRDER V12:** `tom-scen` i `tvatta-djuret` två av två fulla svep, men grönt 6/6
  ensamt och A/B-svepets sex armar rena. Hypotes att MÄTA: harnessens skärmdump hinner före
  första bildrutan under parallell last — då är fixen i `test-games.mjs`, inte i spelet.
- Fallskärmens **tomma luftrum** (~5 s "vänta tills marken") är där fysikens nyanser skulle
  få en publik — doc §4 [Medium] "Samla på vägen ner".
- Nattkön fortsätter: `ballonglyft` → `sapbubblor` → P3 → V10 → `/rost`.

---

## 2026-08-10 · v1.85.0 · Spår 3 P2 inledd — plask-i-vattnet fick riktigt vatten

**Byggt:** Första kunden i runda P2. `plask-i-vattnet` har ett **SPH-ytskikt** ur
`lib/vatska.js`: ytan svallar när något slår igenom den, nivån STIGER av undanträngd volym
och vattnet slår ihop bakom det som sjunker. Bara ytskiktet simuleras (330–400, 416
partiklar); djupet är samma ritade kropp som förut och skarven döljs av en påfyllning i
exakt samma ton. Ny sond `scripts/_plaskprobe.mjs` (12 mått), och `_vatskeprobe` känner nu
igen släpp-spel och tömmer hyllan i tanken.

**Tre saker som bara mätningen kunde säga:**

1. **Vilopackningen är 73 px² per partikel.** Första fyllningen (15 px-rutnät) sjönk ihop
   till en 42 px hög sträng med ytan på y=428 — 98 px UNDER flytkraftens nollinje, alltså en
   lysande blå stapel som svävade mitt i tanken. Fyllningen räknas nu ur den siffran.
2. **Nedslagspunkten låg på fel sida om ytan.** Föremålet föddes 140 px under vattenytan
   medan "plasket" var en ritad ring vid ytan. Med riktigt vatten syns det direkt: en sten
   som föds under ytan rör inte en enda partikel.
3. **Mer fart ger INTE större plask.** 5,4–7,0 px/steg mot 3,2–4,6 gav LÄGRE stänk (20 mot
   23 px) och föremålet dök rakt igenom skiktet, så undanträngningen försvann med det.
   Farten trycker undan vatten i sidled, den kastar det inte uppåt.

**Ljusranden vid hyllan bortmaskad.** Metabollens kant hänger ner under skiktets osynliga
hylla och lyste igenom påfyllningen: uppmätt 125,189,228 mot vattnets 112,182,225 i ett band
y≈410–425 — en tunn vågrät linje tvärs tanken. Mask, inte `boundsArea`: filtrets rendermål
växer med suddets padding, så klickar strax utanför ytan ritas ändå. Efter: 112,182,225 rakt
igenom, 0 kostnad i FPS.

**Uppmätt:** stänk 24–34 px över ytan · undanträngning 8–13 px på tre flytare · värsta fallet
36–40 px kvar till rimmen · volymen konstant 416 → 416 · 0 partiklar utanför tanken · 58,9 FPS.

**Commits:** `9ec3362` feat(plask-i-vattnet)
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **72/72 gröna** · bygge rent · serverad
på :4173 (Tailscale 8445).
**Öppet:**
- ✅ **Fel-nivåfyndet är avfärdat med mätning, inte med resonemang** (ÅTGÄRDER **V11**, stängd).
  Svitkörningen gav 72/72 gröna men loggade `tom-scen` i **`tvatta-djuret`** (helt tom
  skärmdump). Ensam körning: grön, hela scenen ritad. Därefter **A/B växelvis i 3 rundor** över
  hela sviten med vätskan i den ena armen och spelet före den i den andra — **alla sex armarna
  72/72 gröna och rena**. Vätskefiltret höjer alltså inte flake-frekvensen, och sex fulla
  körningar kunde inte återskapa fyndet. Metoden att A/B:a något som redan är committat står
  nu i ÅTGÄRDER (lägg den GAMLA filen i arbetskopian; armarna byter etikett).
  ⚠️ Svepet stashar filen — dör körningen ligger ändringen i `git stash list`, inte i trädet
  (hände i den här sessionen: `tom-scen`-jakten dödade svepet mitt i en HEAD-arm).
- Runda P2 fortsätter: `fallskarmen` (motståndsvolym) · `sapbubblor` (mjuka bubblor) ·
  `ballonglyft` (lyftkraft).
- ÅTGÄRDER V10 (statisk restitution, 23 spel) väntar fortfarande på ett eget A/B-svep.

---

## 2026-08-09 (natt) · v1.84.0 · Spår 3 P1 avslutad — kulbanas fjäderbräda

**Byggt:** Den sista punkten i runda P1. `kulbana`s studsplatta är nu en **riktig fjäderbräda**:
plankan har eget tillstånd, sväljer kulans anslag, dyker undan och kastar tillbaka den med sin
egen fart uppåt.

- **`lib/fjader.js` — `Fjaderbrada`** (ny primitiv, första kund `kulbana`). Fjäder i px/steg +
  mjukkropp för silhuetten (`mjukkropp.js` tredje kund: plankan BÖJS, foten står still, två rosa
  fjädrar trycks ihop mot undersidan via `undersida(x)`). API: `taEmot` · `steg` · `driv` ·
  `flytta` · `path` · `nolla` · `destroy`.
- **`physics.js` fick `beforeStep(fn)`** — en kropp som spelet driver med en fart måste röra sig i
  matters takt (px/STEG; en bildruta rymmer 1–5 steg).
- **`scripts/_fjaderprobe.mjs`** (19 mått, ingen webbläsare) + **`_fjaderbild.mjs`** (vila ·
  djupast · efter · vriden). `test:all` **72/72 gröna**, `check` 0 fel, `_idleprobe` 0.

**Det som gjorde jobbet värt mer än planerat — två mätningar som ändrade bilden:**

1. **`restitution` på en STATISK kropp är en nullhandling i hela repot.** `_make` sätter statiskt
   EFTER skapandet (NaN-fixen) och matters `Body.setStatic` nollar då restitution. Studsplattans
   `0.95` hade alltså aldrig gjort något — den studsade exakt som en ramp, och det var kulans
   egna 0,42 som avgjorde allt (plattans 0,02 och 0,95 ger identiskt studshopp: 31 px). Docens
   rad *"studsplattan är livlös"* hade en tyst teknisk orsak, inte en designorsak. Fixen är två
   rader men rör 23 spel → ligger som **ÅTGÄRDER V10** med krav på A/B över hela sviten.
2. **Utkastet kommer ur att plankans kropp FLYTTAS uppåt genom kulan**, och `updateVelocity`-
   flaggan är hela mekaniken: 10,83 px/steg med, 3,87 utan, 3,67 för en stillastående planka.
   Samma flagga är ett minfält i draget — ett drag på 230 px gav kroppen farten (−651, −230) som
   låg kvar hela byggfasen, och lösaren läste sedan kontakten som *separerande* → ingen impuls →
   kulan föll rakt genom bräddan, utan konsolfel. Därav `driv()` (med fart) och `flytta()` (utan).

**Uppmätt resultat** (fall 20 · 60 · 140 · 260 · 400 px): studshöjd **37 · 88 · 183 · 272 · 272 px**
mot den styva plattans **3 · 7 · 17 · 31 · 46** — 10,8× vid medianen, med tak (max 14,1 px/steg).
Inpressning 6,9 → 19,4 px av 22. **±30° vridning styr utkastet ±323 px i sidled** (ny agens: barnet
siktar med bräddan). Tio studsar i rad trappar upp och LÅSER sig vid samma tak (platå 271 px). En
kula som rullar över bräddan behåller 5,9 av 7 px/steg.

**Sonden hade fel före koden, tre gånger** — värt att minnas som mönster: `lyft` var klippt av sin
egen initiering, anslaget mättes som max över ALLA kontakter (icke-monotont, eftersom bräddan får
tillbaka kulan), och en callback tog emot `{ x, y }` men plockade ut `{ bx, by }` → `part.x = NaN`
→ kroppen försvann helt ur matter utan konsolfel, alltså en "bräddan gör inget"-bild som bara
handlade om sonden.

**Commits:** se nedan · **Öppet:** runda P1 är klar. Nästa: P2 kraftfältsspel (`plask-i-vattnet`
SPH · `fallskarmen` motståndsvolym · `sapbubblor` mjuka bubblor · `ballonglyft` lyftkraft), sedan
P3 maskiner. ÅTGÄRDER V10 (statisk restitution, 23 spel) väntar på ett eget A/B-svep.

---

## 2026-08-09 (kväll) · v1.83.0 · Spår 3 fysikdjup — P0 (tre primitiver) + P1 (fyra spel)

**Byggt:** Hela runda P0 och merparten av P1.

**P0 — de tre nya primitiverna, var och en med sin första kund** (aldrig bara ett bibliotek):

- **`lib/flytkraft.js` — `Flytvolym`** (LYFTPLAN B6). En rektangel med en yta som äger
  lyftkraft, motstånd, fartspärr, bottenlugn, banfjäder och gupp. **Kund: `plask-i-vattnet`**
  (34 rader handrullad `_applyBuoyancy` borta). ETT tal styr allt: `flyt > 1` flyter med
  jämvikt vid nedsänkningen `1/flyt`, massoberoende. Basen läses ur världens gravitation
  VARJE steg — förut hade ett `setGravity()` mitt i leken tyst gjort allt flytande till
  sjunkare.
- **`lib/magnet.js` — `Magnetfalt`** + **`speedToAccel()` i `physics.js`**. Drag och knuff är
  samma fält åt två håll; returvärdet ÄR närhetsvillkoret. Kalibreringen px/steg → matter
  (den som en gång sög in hela dammen i den parkerade magneten) bor nu på ETT ställe med hela
  härledningen. **Kund: `magnet-fiske`.**
- **`lib/varme.js` — `Varmefalt`**. TVÅ tal, inte ett: `temp` (hur varmt något är NU, driver
  utseende och mjukhet) och `grad` (hur färdigt det hunnit bli, SJUNKER ALDRIG, driver målet).
  Att låta temp styra målet vore ett P0-brott. **Kund: `lagerelden`** — marshmallowen stelnar
  nu igen när den lyfts ur elden, utan att tappa en enda gyllene procent.

**P1 — fyra spel:**

- **`knuffa-tornet`**: klosstyperna hade redan skild fysik men lät som EN träklots. Nu talar
  var och en sitt material — sten 120 · trä 240 · gummi 320 · kronan 760 · glas 1180 Hz.
- **`kulbana`**: ytorna lät redan olika men ALLTID lika hårt. Kraftskalan är kalibrerad mot
  uppmätt kulfart (3–14,6 px/steg, median 7,4).
- **`glasstornet`**: varje landad kula är en mjuk kropp som VOBBLAR — eftersläpning ur
  matter-kroppens egen fartändring, ingen tween. Tre generella tillägg i `mjukkropp.js`:
  `path(g, skala)`, `form(vinkel)` och `skjut(dx, dy)`.
- **`studsa-ner`**: en FLÄKT på en räls — dra upp/ner för höjd, över mitten för att byta sida.
  Uppmätt verkan 0,72 fickor: nog för att vända en nära-miss, för lite för att göra siktet
  meningslöst.

**Sex lärdomar, alla uppmätta:**

1. **En port som inte kan vara bit-identisk måste mätas på rätt storhet.** Flytkraften blev
   0 px avvikelse över 900 steg (samma uttryck). Magnetfältet blev det INTE — det rättar en
   avrundad `277.78` till exakta dt², och matter med kollisioner är kaotiskt nog att förstora
   den ulpen till 39,9 px på 900 steg. Banjämförelsen är fel mått; **fångsttiden** är rätt, och
   den är identisk steg för steg (80/150/220/290 px → 15/41/74/116 steg).
2. **`mat()` sprider materialets fysik — även fält spelet aldrig satt.** `knuffa-tornet` satte
   aldrig `frictionAir`, så tabellens trä-värde 0,012 hade tyst ersatt matters 0,01 i ett
   handtrimmat spel utan att ett enda test blivit rött. Skriv ut talen du vill BEHÅLLA.
3. **En adoptionsräkning säger vad ett spel inte importerar — aldrig vad det redan gör.**
   Planens "billiga impactAudio-våg" höll bara i ett av fyra fall: fem kandidatspel har egna
   tonade `onCollision`-svar och `bowling` har en stämd pentatonisk kombo-stege på fallande
   käglor. Kriteriet står nu i LYFTPLAN under B5.
4. **En kortvarig kraft går inte att dimensionera i terminalfart.** `speedToAccel` ger
   accelerationen för en SLUTHASTIGHET, men fläktens mynt är i strömmen ~0,3 s. Första
   räckvidden lämnade 6 % av kraften kvar där mynten faktiskt faller: uppmätt verkan 8 px.
5. **Sonderna hade fel före koden fyra gånger.** Rostsonden rostade klart och mätte en NY
   marshmallow; sedan mätte den formen med en bounding box, men marshmallowen VRIDER sig runt
   pinnen (kontrollmätt på HEAD). Fläktsonden mätte en avstängd fläkt två gånger i rad och
   rapporterade 8 och 10 px — båda sanna, om en fläkt som inte blåste.
6. **Mät alltid HEADs egen frekvens bredvid din egen.** `_idleprobe` gav 1 framsteg på
   `studsa-ner` och såg ut som en regression; växelvis mätt blev det 2 av 3 i BÅDA armarna.
   Samma sak med `fysik-svalt`: i andra svit-körningen landade den på `bowling`, ett orört spel.

**Commits:** `a1c5ac8` flytkraft+plask · `1aff9de` magnet+speedToAccel+magnet-fiske ·
`51b21d9` varme+lagerelden · `196d592` impactAudio-kriteriet · `ff58ce6` knuffa-tornet ·
`62631bd` kulbana+P1-lägesbild · `2d2c7ac` glasstornet · `8c0de39` studsa-ner

**Kontroll:** `npm run check` 0/0 · `npm run test:all` **72/72 gröna** (fyra körningar) ·
sex nya sonder gröna: `_flytprobe` · `_faltprobe` · `_varmeprobe` · `_rostprobe` ·
`_vobbelprobe` · `_flaktprobe` · `_tornprobe`. Bygge deployat på Tailscale för ägarens
telefonkoll.

**Öppet:** **Spår 3 fortsätter — kvar i P1 är `kulbana`s fjäderbräda** (`mjukkropp` som
trycks ihop under kulan). Sedan:

- **Runda P2 (kraftfältsspelen):** `plask-i-vattnet` SPH-vatten ovanpå flytkraften ·
  `fallskarmen` luftmotståndsvolym (äger ingen matter-värld i dag — spelbyte, inte port) ·
  `sapbubblor` mjuka bubblor · `ballonglyft` lyftkraft mot last (räknar ballonger i dag).
- **Runda P3 (maskinerna):** `kugghjulen` vridmoment · `trollblandning` gegga + `varme`-kok ·
  `magnet-fiske` poler (fältets `styrka` tar redan tecken).
- **Mjukkroppens väntelista** (B2): `sapbubblor` · `mata-monstret` · `hamburgerbygget` ·
  `pruttbad`.
- **Röstklipp saknas för `plask-i-vattnets` namngivning** ("Anden flyter!", "Stenen sjunker!"
  m.fl., 32+ repliker som byggs vid körning). Lägg in dem i `scripts/voice-phrases.json` och
  kör `npm run voice` — F5-TTS fungerar.
- **MOSS är fortfarande nere:** `saknat-ljudklipp` i `bajs-och-kiss`, `kittla-figuren`,
  `peka-pa-kroppen`, `sapbubblor`.
- **Ägarens manuella telefonkoll av full bleed** är fortfarande ogjord.

---

## 2026-08-09 (sen natt) · v1.76.0 · Spår E runda A4 — glöd, emitters, MeshRope, kameran

**Byggt:** Hela runda A4. Fyra punkter, var och en med en verklig kund i ett spel.

- **`lib/glod.js` (nytt)** — additiv glöd som delat idiom (C4). Ett Canvas2D-bakat atlasark
  med `prick` och `stjarna`, EN vit textur för hela appen som färgas med `tint`. `glod()`
  ger en additiv Sprite, `glodBakom()` lägger den under ett föremål. Inga tweens, inga
  timers — exit-säker av konstruktion. **Kund: `lagerelden`**, vars glöd var en platt
  orange skiva på alpha 0.18 och nu är en halo som växer 240→540 px med värmen och lyser
  upp stockar, stenar och gräs.
- **`Emitter` i `partiklar.js`** — `spray()`/`rain()` är engångshändelser; allt som PÅGÅR
  krävde ett `spray()`-anrop per bildruta. Emittern föder i jämn takt ur EN ticker-callback,
  och döda partiklar **återuppstår på plats** så ett jämnt flöde gör noll add/remove efter
  uppstarten. Plus `blend: 'add'` på `spray()` (eget fält, eftersom blandningen sitter på
  containern). **Kund: `trollblandning`**, vars kittel puttrade ur ~30 rader handrullad loop
  med tak på ÅTTA bubblor och en ny Graphics per bubbla.
- **`repMesh()` i `rep.js`** — repet som MATERIAL. `repTextur()` bakar ett tvärsnitt med
  Canvas2D i tre profiler (`rep` · `slang` · `slat`); 64×32 är tvåpotenser med flit, för
  `textureScale > 0` sätter `addressMode: 'repeat'` och en del drivrutiner klämmer i stället
  för att wrappa annars. **Kund: `zackes-biltvatt`**, vars slang ritades med tre strokes och
  nu bär ribbor och dager som åker med i varje böj.
- **Kameran fick sin första kund: `spindel-zacke-svingar`** (efter ägarens grind — 18 spel
  utreddes, se LYFTPLAN §9). Banan var hårdklämd till 920 px av
  `Math.min(cfg.gap, 920 / (count - 1))`, och eftersom antalet fästen växte med nivån blev
  varje hopp **kortare** ju längre barnet kom (nivå 1: 3 fästen à 300 px · nivå 6: 6 à 184).
  Progressionen gjorde alltså varje enskilt hopp lättare, och hela stan syntes från första
  svinget. Nu: konstant 300 px gap, och nivån lägger till FÄSTEN (3 → 4 → 6 → 8 → 10) i en
  värld på upp till 3400 px. Fem lager — scenens band, en fjärran stadssiluett på
  `DJUP.fjarran`, spelplanet, **ett eget fx-lager i världen** och HUD på faktor 0.
- **Och ett dygn som går** (v1.74.0). Spelet är en slinga — rädda en kattunge, rädda en till
  — så utan något som förändras mellan varven blir den femte räddningen identisk med den
  första. Stämningen följer nu nivån: `dag → morgon → skymning → kväll → natt`, sedan om
  (`nivå % 5`; nivå 0 är oförändrad). Byggt på `createScene`s befintliga `tid`-tonning plus
  `night` — ingen ny scenkod. **Husen tintas i TVÅ delar:** kroppen mörknar
  (`0xffffff → 0x6f77ad`) medan fönstren går åt andra hållet och tänds
  (`0xfff6d0 → 0xffd95c`). En enda tint hade släckt fönstren i samma andetag som väggen
  mörknade, och ett mörkt hus med mörka fönster läser som en kuliss, inte som en stad där
  någon bor. Nytt i `kamera.js`: **`byteScen()`** — scenens band ÄR kamerans understa lager
  och ligger i `_layers`, så de gamla måste plockas ur listan, annars flyttar kameran
  osynliga containrar varje bildruta. Uppmätt: lagerantalet står still på 14 över sex
  nivåbyten.
- **Och §4:s hela Variation-sektion avbockad** (v1.75.0). Stadsdelen blir finare åt höger
  (fönster → balkongräcken → spira), fästena glöder starkare mot kattungen, och fågel/ballong/
  stjärna hänger mellan fästena och ger ett pling ur en pentatonisk stege när båg-kastet stryker
  förbi. Höjden på husen rörs INTE: `ROOF_Y` är fångstgolv och kattungen sitter på
  `ROOF_Y − 46`, så högre hus mot målet hade lagt takåsen över båda.
- **Och superhjälte-posen** (v1.76.0, §4 Juice). Zacke snurrade förut bara
  (`rotation += 0.04`) — det läser som att han tappat kontrollen, och en hjälte STYR sin
  flykt. Nu ritas kroppen om till en flygpose vid släpp (armarna rakt fram förbi huvudet,
  benen ihop bakåt) och vrids mot `atan2(vy,vx) + π/2`, klämt till [0,42; 1,85] rad så han
  aldrig dyker som om han störtade. **Fart-strecken bor i hans egna koordinater** — då följer
  de med när kroppen vrids och pekar alltid rakt bakåt, utan en enda vinkelberäkning.

**Fem lärdomar, alla uppmätta:**

1. **Additivt ljus kräver TVÅ saker — C4-listan tänkte bara på det ena.** Inte bara en mörk
   botten att lysa upp, utan också en KÄLLA MED TAKHÖJD KVAR. Lägereldens lågtungor ligger
   med flit 5–10 djupt och `_flameColor` startar på nära vitt: summan av tio nästan vita
   skivor är vit oavsett bakgrund, så elden blev en vit klump i BÅDA stämningarna. Lågorna
   är därför medvetet kvar på normal blandning; bara halon är additiv. Trollblandningens
   bubblor faller på det omvända villkoret — brygdfärgerna är mörka och adderar nästan
   ingenting. **C4:s sju kandidatnamn måste läsas om mot båda villkoren.**
2. **En stoppad emitter återskapade sitt tomma fält varje bildruta.** `_falt()` bygger ett
   fält när det saknas och anropades först i `steg()`, alltså direkt efter att städningen
   rivit föregående — det vilande fältet på ett app-långlivat lager som CLAUDE.md varnar
   för, byggt på nytt 60 ggr/s. Hittat av sonden, inte av ögat.
3. **`npm run test` visar alltid nivå 0.** Lägereldens `sunset → night` vid nivå 2 var
   därmed osynlig för hela sviten. Nya `scripts/_nivabild.mjs` tar en bild per nivå — och
   skriver genom appens EGEN SaveService, för att peta i localStorage träffar ett tomt
   dokument i en färsk kontext (och `profiles` är en array, inte en uppslagstabell).
4. **`ctx.fxLayer` är skärmrymd, och det märks först när kameran rör sig.** En `sparkle()`
   vid ett fäste 2000 px in i världen hade dykt upp 2000 px in på SKÄRMEN. Ett spel med
   kamera behöver ett eget fx-lager i faktor 1; kvar på `ctx.fxLayer` hör bara det som
   följer FINGRET. Samma sak i andra riktningen: `kam.moveTo()` krävs vid nivåstart,
   eftersom Zacke teleporterar och kamerans hårda ruta annars rycker bilden med.

**Commits:** `5ee3481` glod+partiklar+lagerelden · `6dc07c3` trollblandning ·
`0d5ae03` rep+zackes-biltvatt · `961594e` spindel-zacke-svingar+kamera · `25d441b` dygnet ·
`9e45c1d` snart framme + skörden · `d9ef2d2` superhjälte-posen
**Kontroll:** `npm run check` 0/0 · `npm run test:all` **72/72 gröna** ·
`_glodprobe.mjs` helgrön (additivitet bevisad mot en normal-kontrollarm: 255,60,60 mot
247,2,2) · `_varldprobe.mjs` 13/13 (kameran 1045 px mot fjärranbandets 188 = kvot 0,18,
precis lagerfaktorn; Zacke utanför bilden i 0 av 130 prover; stämningarna cyklar utan
lagerläckage; 2 av 2 passerade godsaker plockade; 0 av 5 liv-tweens tickar efter exit) · `_svingprobe.mjs` fortsatt
7/7 · `_repprobe.mjs` fortsatt grön i Node.

**Öppet:** **Spår E är klart (A1–A4)** — nästa naturliga steg är **spår 3 fysik**
(`flytkraft.js` · `magnet.js` · `varme.js`, var och en med första kund; sedan rundorna P1–P3).

Kvar i mindre högar:

- **`spindel-zacke-svingar` §4** — Variation & överraskning och Juice är avbockade. Kvar:
  **[Medium] synligt släpp-fönster** och **[Medium] belöna bra släpp** (de enda två som
  ändrar hur spelet SPELAS — resten är dekor), [Medium] räddnings-galleri, [Quick] Elvira
  reagerar längs vägen, [Quick] folk i fönstren, samt 🔶 vind-sus/moln-pluff som väntar på
  att MOSS kommer upp.
- **`domino`** är kamerans starkaste nästa kund (`nSlots = Math.min(7 + level, 13)` av rena
  skärmbreddsskäl — från nivå 6 slutar spelet växa) men kräver ett designbeslut om
  bricktråget, som idag förutsätter att tråg och lucka syns samtidigt. Se LYFTPLAN §9.
- **C4:s glödkandidater måste läsas om** mot BÅDA villkoren innan fler rullas ut — se
  lärdom 1 ovan. `enhorning-glitterbajs` (candy-bakgrund), `blixt-och-dunder` (sunset) och
  `golvet-ar-lava` (ljus vulkanhimmel) ser ut att falla på det ena eller andra.
- **MOSS är fortfarande nere:** `saknat-ljudklipp` i bajs-och-kiss, kittla-figuren,
  peka-pa-kroppen och sapbubblor är saknade manifest-poster. Rösten (F5-TTS) fungerar.
- **Ägarens manuella telefonkoll av full bleed** är fortfarande ogjord (bygge → preview →
  Tailscale, rotera mitt i ett spel).

**Två svit-transienter observerade, båda avfärdade med mätning, inte med gissning:**
`golvet-ar-lava` flaggade `tom-scen` i en `test:all`-körning men var ren enskilt (0 bildfynd),
och `spindel-zacke-svingar` flaggade `saknat-ljudklipp` för `djur_katt` — ett klipp som FINNS
på disk — i en körning. Växelvis mätt: 0 av 3 med ändringen, 0 av 3 utan. `sample()` hinner
före avkodningen.

---

## 2026-08-09 (natt) · v1.71.0 · Spår E runda A3 — karaktärsriggen är utrullad, 22 av 22

**Byggt:** De sex sista Bobo-spelen bytte från stillbild till riggen `lib/karaktarer.js`:
`domino`, `flipperspel`, `hamburgerbygget`, `kulbana`, `sapbubblor` och `knuffa-tornet`
(det sista från `figurer.js`). Därmed är utrullningen KLAR — **`mascot.js` har en enda
kund kvar, `gravmaskinen`**, som är det dokumenterade undantaget (r 11 ⇒ ögonen blir
1,7 px och en min går inte att läsa).

- **Ägarreglerna höll rakt igenom.** `view.scale` = alltid riggens andning (knuffa-tornets
  egen andnings-tween togs bort); `view.y` = den med största gesten (domino 52 px,
  sapbubblor 34, kulbana 26 — alla större än `jubel`, så spelen behöll sina hopp och riggen
  bidrar med `setMood('stolt')`); `kropp: false` när den ritade kroppen ÄR rollen
  (grillmästarens förkläde, kulbanans blå byxor, Bobo bakom flipperbordet, den svävande
  kulkroppen i sapbubblor).
- **Handrullad mimik ersatt av riggen.** sapbubblors `_boboMouth` (en gap-mun med
  alpha-tween) är borta — riggens `nam` ÄR att tugga och svälja. Det var precis den sortens
  per-spel-mimik riggen byggdes för.
- **`look()` gav mest per rad:** flipperspel följer kulan, hamburgerbygget det barnet drar
  (annars bygget), kulbana kulan hela vägen ner — alla via
  `outer.toLocal(mål.getGlobalPosition())`.

**Två fynd:**
1. **Bygghjälmen i knuffa-tornet täckte hela ansiktet.** Brättet låg på `y = 0`, och riggens
   ögon ligger på −0,12·r medan `makeBobo` hade dem lägre. Hittat i en **närbild** —
   `npm run test` var grönt hela tiden. Lyft till −0,46·r.
2. **En rigg som byggs om under spelets gång måste `destroy()`:as.** kulbanas mottagare byggs
   per bana. Uppmätt: 10 ombyggnader → 0 gamla riggar lever, 0 aktiva tweens kvar.

**Commits:** `bd06566` domino+flipperspel · `8fc1a75` hamburgerbygget+kulbana ·
`4d864ac` sapbubblor+knuffa-tornet
**Kontroll:** `npm run check` 0/0 · `npm run test:all` **72/72 gröna** · sex närbilder
granskade i `_narbild.mjs`.
**Öppet:** A4 (blendMode-add glow, kontinuerliga emitters i partiklar.js, MeshRope via
Canvas2D-textur, kamerans första kund), sedan spår 3 fysik. Ägarens manuella telefonkoll
av full bleed är fortfarande ogjord.

---

## 2026-08-09 (sen kväll) · v1.70.0 · Spår E runda A2 — övergångar med riktning, vilorörelse

**Byggt:** Andra rundan i animationsspåret: skärmbytena fick en riktning, och sex spel som
stod helt stilla i vila fick liv.

- **`Nav.js`** — den nya skärmen läggs **underst och full direkt**; det är den GAMLA som
  glider undan och tonar bort ovanpå (vänster djupare in, höger tillbaka). Ordningen ger
  både riktningen och frihet från cremeblänk — med en korstoning är båda skärmarna
  halvgenomskinliga en stund och skalets creme lyser igenom. `_busy` hålls nu tills
  övergången är klar.
- **`GameHost`** — ankomst-takt från skala 1.06 ned mot 1. Aldrig UNDER 1: en scale-in
  underifrån hade visat creme runt kanterna en halv sekund.
- **`feedback.liv()`** — gupp + vaggning med **egen fas per föremål** (`breathe` var
  skal-bara och synkron). Tänd i loopdjuren, hamburgerbygget, enkelt-pussel,
  vart-tog-det-vagen, fyrverkeri och gravmaskinen. Mönstret som gör det ofarligt: lägg
  rörelsen på en INRE behållare när det yttre objektet ägs av någon annan (drag, hyllans
  svep, spelets egen blandning). djurorkester lämnades med flit — korten pulsar redan i takt
  med rytmen.
- **Två nya sonder:** `_navprobe.mjs` (riktning, creme mitt i bytet, routerlås) och
  `_livprobe.mjs <id>` (amplitud, fasspridning, tickar något efter exit).

**Två lärdomar, båda uppmätta:**
1. **`isActive()` ljuger** om en tween som dödat sig själv inifrån sin `onUpdate` — den
   fryser sin `totalTime` men rapporterar fortfarande aktiv. Mät att den slutar **ticka**.
2. **Ändrad övergångstiming gör latenta exit-buggar deterministiska.** `studsbollar`
   tweenade målgjorda bollar 0,2 s ner i korgen; de hade redan lämnat `_balls`/`_shot`, så
   `destroy` hittade dem inte och tweenen skrev till en förstörd Container. Rött 3 av 3 med
   A2-skalet, grönt 3 av 3 utan (växelvis mätt) — buggen var gammal, A2 gjorde den synlig.

**Commits:** `fda74a6` feat(lib) liv() · `e1eb6e2` feat(shell) övergångar ·
`0172b83` feat(6 spel) vilorörelse · `27cba25` fix(studsbollar) exit-bugg
**Kontroll:** `npm run check` 0/0 · `npm run test:all` **72/72 gröna** (en `tom-scen` på
tvatta-djuret i parallellkörningen var svitens kända transient — grön enskilt).
**Öppet:** A3 (riggens sista 6 spel: domino, flipperspel, hamburgerbygget, knuffa-tornet,
kulbana, sapbubblor), A4 (add-glow, emitters, MeshRope via Canvas2D, kamerans första kund),
sedan spår 3 fysik. Ägarens manuella telefonkoll av full bleed är fortfarande ogjord.

---

## 2026-08-09 (kväll) · v1.69.0 · Spår E runda A1 — rörelse-tokens, delad squash, tyngd i draget

**Byggt:** Andra spåret i treprogrammet (skärm → animation → fysik) startade med den runda
som bara rör lib: tokens, delat rörelseordförråd och tyngd i draget.

- **`ANIM` fick konsumenter.** Tokens i theme.js hade NOLL användare — värdena var
  handkopierade med drift till fem filer (fade 0,16/0,18/0,2/0,25). Button, Nav,
  LibraryScreen och MenuScreen läser tokens nu; `ANIM` fick `settle`, `lift` och `squash`.
- **Tre delade hjälpare i feedback.js:** `squash(t,{intensity,hop})` (djurorkesters `_hop`
  befordrat — spelet anropar nu lib-versionen och blev 18 rader kortare), `landa(t,{base})`
  och `stegra(list, fx)`. Alla exit-säkra, alla följer vilolägesregeln.
- **Tyngd i DragController** (23 dragspel ärver): eftersläpning via `gsap.quickTo`, lutning
  ur eftersläpningen (blir automatiskt fartproportionell utan hastighetsmätning), översläng
  + `landa()` i målet, och en lyft-skugga. **Eftersläpningen är bara visuell** —
  träffprövningen använder fingrets position (`rec.tx/ty`), så inget mål blev svårare att
  träffa (mätt mot HEAD: samma träffutfall i harnessens autodrag).
- **Två fällor, båda uppmätta.** (1) Lyftet måste pinna både vilo-skala OCH vilo-rotation:
  sortera-skraps `wiggle()` vid fel släpp läste annars LUTNINGEN som vilovinkel och lämnade
  föremålet 0,15 rad snett. (2) Skuggan gjordes **opt-in** — ungefär hälften av dragspelen
  ritar redan en egen, och två skuggor som glider isär under ett snabbt drag syns direkt.
  Tänd i de fem som saknade en (enkelt-pussel, kla-efter-vadret, kugghjulen, plask-i-vattnet,
  siffertaget).
- **Ny sond `scripts/_dragprobe.mjs`** mäter eftersläpning, lutning (mot föremålets EGEN
  vilovinkel), skuggans liv, barnantalet i lagret och exit mitt i ett drag. Sju spel: 12–16 px
  släp, 0,10–0,13 rad lutning, allt städat. Sondens egen fälla: `page.screenshot()` tar
  ~100 ms — mät FÖRE fotot, annars har bilden hunnit i kapp och släpet mäts till 0.

**Commits:** `3773cc1` feat(lib) tokens+feedback · `3fd73a0` feat(lib) tyngd i draget ·
`6ef9202` feat(5 spel) skugga · `53c5028` refactor(djurorkester)
**Kontroll:** `npm run check` 0 fel/0 varningar · `npm run test:all` **72/72 gröna**
(kvar: de fyra kända `saknat-ljudklipp` som väntar på att MOSS kommer upp).
**Öppet:** A2 (riktningsmedvetna Nav-övergångar + `liv()`-idle), A3 (riggens sista 6 spel),
A4 (add-glow, emitters, MeshRope via Canvas2D, kamerans första kund). Ägarens manuella
telefonkoll av full bleed är fortfarande ogjord.

---

## 2026-08-09 · v1.68.0 · Full bleed — bakgrunder täcker hela telefonskärmen (LYFTPLAN spår D)

**Byggt:** Ägarens Pixel 10 Pro (20:9) visade creme-lister vid sidorna och spelobjekt
"parkerade utanför skärmen" stod fullt synliga i dem. Fixat i tre rundor + ett treprogram
planerat (skärm → animation → fysik, godkänd plan i `~/.claude/plans/immutable-soaring-hippo.md`):

- **Runda 0 (alla 72 spel):** `lib/view.js` — `VIEW` = synlig designyta (muteras av Scaler),
  tak `BLEED_X 240`/`BLEED_Y 160`, `onViewChange`. `ctx.view` i GameContext (läs vid
  användning, cachea/mutera aldrig — dokumenterat i spelkontrakt-skillen). `scene.js` ritar
  full bleed med platta kjolar/remsor UTANFÖR 16:9 → 1280×720-bilden pixelidentisk, ingen
  ombaslinjering; vinjetten enda responsiva lagret. Konfettiregn över VIEW. `PhysicsWorld`
  fick `bounds`-param (opt-in med flit — testad fysik får inte tyst avvika per enhet).
  Testharnessen: `--viewport WxH` (tryck mappas genom letterboxen → samma designkoordinater
  träffar rätt i alla viewports) + `kant-cream`-koll i bildkoll.
- **Runda 1 (16 spel, 3 spelbyggare-agenter):** egna bakgrunder breddade, pop-in fixade
  (siffertågets lok, vad-forsvanns filt, såpbubblors studs 163 px in i bilden). **Fällor
  hittade:** himmelsgradienter får bara breddas i SIDLED (bbox-höjden styr mappningen;
  runda 0 hade glömt själva breddningen — en agent hittade det med pixelmätning);
  `COLORS.bg` som spelbakgrund kan ALDRIG passera kant-cream (färgen ÄR letterboxen) →
  varm ton 0xfff0d6. Kollen mäter nu värsta ZONHALVAN + två design-undantag (creme-bord
  ≥35 %, creme-ram ≥60 % — folj-sparet).
- **Runda 2:** natskott-pa-stan (lagersådd/återvinning täcker bleed-zonen, mål-spawn mot
  `ctx.view`). Seam-kollarna (klappa-mullvaden, glasstornet, enhorningen-elvira) granskades
  i bild och läser som avsiktliga kort/paneler — lämnade.

**Mätning:** `test:all` 72/72 · bred svep 952×428: 0 äkta kant-cream kvar. OBS: parallell-
svepen kastar tom-scen/konsolfel-transienter på ORÖRDA spel (~3–4 per körning) — kör om
enskilt innan du tror på dem.

**Commits:** `d635d45` runda 0 · `ad393c1` himmel+kollförfining · 16× `fix(<id>)` ·
`ea91a1d` natskott · `10ffc8a` docs/LYFTPLAN spår D · + denna sessionslogg.

**Öppet:** (1) **Ägarens telefonkoll återstår** — build → preview → Tailscale, rotera mitt
i spel. (2) Planens spår 2 (animation: A1 ANIM-tokens+squash/landa/stegra+DragController-
vikt · A2 Nav-övergångar+`liv()`-idle · A3 riggens 6 sista · A4 add-glöd/emitters/MeshRope-
via-Canvas2D/kamerans första kund) och spår 3 (fysik: flytkraft/magnet/varme-libbar + tre
fördjupningsrundor P1–P3) väntar i plan-filen. (3) saftbarens `FluidView.area` klipper
spill ~40 px före kanten på bredaste telefonerna (mät med `_vatskeprobe` före breddning).

## 2026-08-09 · v1.66.0 · Karaktärsriggen, omgång 4 — fyra spel till (16 kunder, 6 kvar)

**Byggt:** `vippbradan` · `lagerelden` · `pizzabageriet` · `zackes-biltvatt`. Alla fyra fick
riggen i en **yttre container** (spelet äger `y`/`pop`/`wiggle`, riggen sin `view.scale`), och
alla fyra fick `look()` — figuren tittar på det barnet håller i, inte rakt fram.

| Spel | Kropp | Vad figuren gör nu |
|---|---|---|
| `vippbradan` | rigg | följer grodan hela flygbanan · `jubel` vid landning · `hoppsan` vid miss |
| `lagerelden` | `kropp: false` | `hungrig` i vila · blicken följer marshmallowen · `nam` per bit |
| `pizzabageriet` | `kropp: false` | följer dragen ingrediens · `nyfiken`→`hungrig` med ugnen · `heja` |
| `zackes-biltvatt` | `kropp: false` | följer svampen/munstycket · `heja` per ren yta · `stolt` |

**Vippbrädans handritade kropp togs inte bort — den kändes igen.** `karaktarer.js:_byggKropp`
skrev av precis de måtten (skugga 2,36·r = 118, fötter 2,16·r = 108, bål 1,36·r = 68, axel
±0,54·r = ±27, tass ±1,04·r = ±52). 15 rader `Graphics` blev ett anrop. De tre andra behöll sina
kroppar (`kropp: false`) för att de bär något som är figurens ROLL: bagarens förkläde, ägarens
lila jacka, och Bobo som tittar fram över ett moln där en kropp hade hängt ner genom molnet.

**Två mätningar som omgången lade till:**

1. **Ett grönt test bevisar inte att en rigg som byggs om under körning städas bort.**
   `zackes-biltvatt` byter ägare en gång per bil med `removeChildren().destroy()` — det river
   displayträdet men rör inte gsap. En rigg utan `destroy()` lämnar **två odödliga tweens**
   (andningen på `view.scale` + den självbokande blinkningen). Ny sond `scripts/_agarprobe.mjs`
   kör 12 ägarbyten via `window.__barnspel.game` och läser levande tweens ur gamelogs
   `render/prov`: **utan `_kar.destroy()` 10 → 18 (+8 på 4 Bobo-bilar = 2 per rigg), med den
   10 → 8.** Och det viktiga: gamelogs egen `tween-lacka` sa **0 i BÅDA armarna** — den dömer
   bara tweens vars mål har `.destroyed`, och andningens mål är `view.scale`, en
   ObservablePoint utan den flaggan. Sonden validerades mot en avsiktligt trasig arm innan
   den fick uttala sig (regeln "en röd sond är ett påstående" gäller åt båda hållen).
2. **Ögat läste blicken fel — igen.** I närbilden av biltvättens ägare tyckte jag pupillerna
   pekade höger; uppmätta centroider låg **14 bildpunkter till vänster** om ögonmitten, alltså
   mot bilen. Därför ny sond `scripts/_narbild.mjs`: klipper ut en ruta ur ett spel med
   `deviceScaleFactor` (pixlarna FINNS, en uppskalning efteråt hittar bara på dem), går via
   canvasens verkliga läge så letterboxen inte förskjuter rutan. Bryn på 0,02–0,3 rad är
   några få pixlar i en 1280×720-bild.

**Commits:** `3c2d9e0` vippbradan · `5270a56` lagerelden · `bbf4dba` pizzabageriet ·
`cc3ccbf` zackes-biltvatt · `docs` (den här posten + §5 i fyra spel-docs)

**Öppet:** 6 verkliga kandidater kvar för riggen — `domino` · `flipperspel` · `hamburgerbygget`
· `knuffa-tornet` · `kulbana` · `sapbubblor` — plus de två dokumenterade undantagen
(`gravmaskinen` r=11 för liten för en min, `bajs-och-kiss` lokal figur som spolas ner).
`test:all` 72/72, `check` 0/0. Kvarvarande `saknat-ljudklipp` i fyra spel är MOSS-hålet, inte
en regression.

## 2026-08-09 · v1.65.0 · Karaktärsriggen, omgång 3 — fyra spel till (12 kunder, 10 kvar)

**Byggt:** `blixt-och-dunder` · `fallskarmen` · `saftbaren` · `tarta-i-ansiktet`.

**Två spel ströks efter läsning — dokumenterade undantag, inte glömska:**

- `gravmaskinen` kör `makeMascot(11)`. Vid r 11 är ögonen 1,7 px och brynen 0,8 px breda; en
  min går inte att läsa, och riggen hade lagt en andnings-tween per bildruta på något osynligt.
- `bajs-och-kiss` använder en **lokal** `makeMascotHead(38)` för en gäst som snurrar fritt i
  virveln — kodens egen kommentar säger varför den ritas lokalt. Vilo-andning på ett föremål
  som spolas ner är fel verktyg.

**Två saker omgången lade till:**

1. **En YTTRE container är svaret när spelet speglar figuren.** `fallskarmen` sätter
   `scale.x = ±1` för att vända Bobo mot mattan. Riggens andning tweenar `view.scale` till
   0,988 — den hade **raderat spegelvändningen** och vänt honom åt fel håll, utöver att hacka.
   Med riggen i en egen container äger spelet spegling + rotation och riggen sin egen skala,
   och `toLocal` går genom `scale.x` så `look()` pekar rätt utan en enda specialrad.
2. **Häng reaktionen på mätningen, inte på en timer.** `saftbaren` tuggar (`nam`) bara när
   `drain()` faktiskt returnerade partiklar — munnen rör sig när det rinner i den.

**Räkningen är gjord på importer, inte på ordet i en kommentar.** Flera redan bytta spel
nämner fortfarande `makeBobo` i en kommentar om origo, så en naiv `grep -l makeBobo` gav 17
"kvarvarande" spel av vilka 5 var klara.

**Commits:** `483a488` blixt-och-dunder · `a8a4698` fallskarmen · `39fc83f` saftbaren ·
`5997294` tarta-i-ansiktet

**Öppet:** 10 verkliga kandidater kvar + fyra med egen mimik. `test:all` 72/72, `check` 0/0.

## 2026-08-09 · v1.64.0 · Karaktärsriggen, omgång 2 — fyra spel till (8 av 23)

**Byggt:** `studsmatta` · `poppa-ballonger` · `glasstornet` · `klambubblor`. Omgången handlade
mindre om att byta figur och mer om **vem som äger vilken egenskap** när riggen flyttar in i ett
spel som redan animerar sin maskot:

- **`view.scale` är alltid riggens andning.** Ett `pop()` på samma nod blir hackigt. Antingen
  flyttas det till den yttre containern (`poppa-ballonger`, `glasstornet`) eller byts mot en
  `react()` (`klambubblor`, `studsmatta`).
- **`view.y` ägs av den som har den största gesten.** `klambubblor` har fyra hopp på 40 px och
  behöll dem — därför `setMood('stolt')` i stället för `react('jubel')`, som hade tweenat samma
  `y` samtidigt.
- **`rotation` är fri.** Riggen rör den aldrig utom via `huvud`.

**En placeringsregel värd att skriva ner:** `makeBobo` och riggen delar origo (huvudets centrum)
och 2,36·r till skuggan, så de byts rakt av. En **handritad** kropp gör det inte —
`glasstornet`s skugga låg på 158 px, alltså 26 px längre ner, och origo måste flyttas lika
mycket för att fötterna ska stå kvar på golvlinjen.

**Och en gång till: mät minen, titta inte bara.** `glasstornet`s Bobo såg vid första anblicken
skeptisk ut i en 3×-uppzoomad skärmdump. Uppmätta brynlutningar: **−0,045 / +0,092** mot
designens −0,040 / +0,100 för `hungrig` plus huvudets 0,03 lut. Asymmetrin ÄR huvudets lutning,
inte en trasig spegling — och mitt första mätförsök var fel för att fönstret råkade innehålla
pupillerna, vilket gav två parallella bryn som inte finns.

**Commits:** `f527b93` studsmatta · `f96f8d9` poppa-ballonger · `a8e7f16` glasstornet ·
`e056660` klambubblor

**Öppet:** 15 spel kvar med `makeMascot`/`makeBobo` + fyra med egen mimik. `test:all` 72/72,
`check` 0/0.

## 2026-08-09 · v1.63.0 · Utrullning av karaktärsriggen, omgång 1 (pilot om tre spel)

**Byggt:** `lib/karaktarer.js` gick från 1 kund till 4. Piloten valdes så att de tre spelen
kräver olika sorters byte: `trollblandning` byter bara HUVUD på en egen figur (`kropp: false`,
manteln/armarna/staven står kvar), `gungan` byter hel figur (`makeBobo` → riggen), och
`bowling` byter huvud **plus** en handritad kropp som var en kopia av `makeBoboBody`.

**Tre fynd, alla ur mätning och ingen ur lib-koden:**

1. **`destroy()` dödade aldrig pupillerna.** De saknades i nodlistan, och `look()` är det enda
   som rör dem — hålet var osynligt så länge ingen kund använde `look()`. Ett spel som följer
   ett rörligt mål anropar det varje bildruta: 120 tweens/s på två Graphics, `_track` slängde
   de äldsta ur `_tw`, och efter exit skrev en tween `.y` på en riven Graphics varje bildruta.
   Uppmätt i `gungan`: **7 pageerror + 1 `tween-lacka` → 0.**
2. **En armgest måste svinga UTÅT.** Tassen står i vila på `sida·1.04r`, huvudet når `0.97r` —
   marginal 0,07·r. En rotation uppåt (0,62 rad räckte) drar in tassen bakom huvudet och Bobo
   står med armarna BORTA. Jag skrev först om `jubel` som en "teckenbugg" och hade fel: den
   befintliga riktningen gav en synlig pose, min "fix" gjorde armarna osynliga.
   `_karaktarbild.mjs` avgjorde; koden såg lika rimlig ut åt båda hållen.
3. **Ny reaktion `heja`** — halva `jubel`s utslag, inget hopp. En upprepad handling som firas
   med `jubel` gör firandet till bakgrundsljud, och då markerar ingenting längre att målet
   faktiskt nåddes.

Ordningsregel för nästa kund: `gsap.killTweensOf(bobo)` träffar även riggens egen hopp-tween
på `view.y` — en `react()` före rensningen dödas direkt. Och skalan är upptagen av riggens
andning, så ett `pop()` på samma nod blir hackigt.

**Commits:** `8e01eec` heja + armregel · `7e2b2ab` trollblandning · `e3ab4b3` pupill-läckan ·
`9c1d549` gungan · `ddb5e08` bowling

**Öppet:** 19 spel kvar med `makeMascot`/`makeBobo` + fyra med egen mimik. `test:all` 72/72,
`check` 0/0. Oförändrat: `saknat-ljudklipp` i 4 spel (MOSS nere), två `npm run dev`-instanser
och en död `.server.pid`.

## 2026-08-09/10 · v1.62.0 · Nattpass — LYFTPLAN 7·8·9·11·12 klara, V9 stängd, och fyra sonder som ljög

**Byggt:** en obruten nattkörning på ägarens begäran ("jobba vidare medan jag sover, gå på din
rekommendation"). Fem LYFTPLAN-rader stängda, plus ett P0-fynd som visade sig vara mätfel.

### 1. Fjorton "P0-brott" var mätfel (`5da515d`, v1.50.0)

Baslinjen visade 14 spel med `sen-aterkoppling` och `tryck-utan-ljud`. **Alla var harnessens
auto-DRAG, inte tryck.** `judge()` i `gamelog.js` testade `outputs.length` FÖRE `dragged`, så
samma rörelse dömdes av två regler beroende på om något råkade låta: ett tyst drag hamnade i
`gest-utan-ljud` och gick fritt, ett identiskt drag som råkade starta en lyft-animation eller
sammanföll med ett omgivningsljud larmade. `lagerelden` mätte fasen till nästa knaster i eldens
280 ms-loop (169/228/277 ms) och kallade det svarstid; `studsbollar` mätte nästa boll som
poppade av sig själv. **Efter fixen: `tryck-utan-ljud` 6 spel → 0, `sen-aterkoppling` 4 → 1.**
Utan den här mätningen hade natten gått åt till att "fixa" fjorton spel som var hela.

### 2. Det som var ÄKTA: tysta tryck under upptagen-fas (`1168e24`, `35defca`, `3d30e32`)

`dod-traffyta` var på riktigt: ett spel som firar eller demonstrerar svarade med TYSTNAD, och
för ett barn som inte kan läsa "vänta" är en tyst skärm inte en paus — den är trasig. Ny delad
`kvittera()` i `feedback.js` (dämpad ton + tunn ring) och fem kunder. `vad-forsvann` hade
dessutom en **död yta mitt på skärmen**: trycket landade på filten, inte på rutorna under, och
filten hade ingen hanterare alls.

Tre körningar i rad gav tre OLIKA spel med samma bugg — harnessens åtta sekunder träffar rätt
fas av en slump. Därför **`scripts/_tystprobe.mjs`**, som följer pekbindningarna och flaggar
tidiga returer utan kvitto: **53 kandidater i 28 spel**, lagda som `ATGARDER` V9. Inte fixade
blint — sonden läser text, inte beteende.

### 3. LYFTPLAN rad 8 — material som LÅTER (`045d6f3`, v1.52.0)

`MATERIAL` + `mat()` (trä · metall · sten · gummi · glas) och `onImpact`/`impactAudio` i
`physics.js`: anslagsfart → volym OCH tonhöjd. Rösten är syntes, inte klipp — repot har inga
klipp som heter `knack`/`duns`/`klirr`, och ett klipp har EN dynamik. Kunder: `domino`,
`bygg-tornet`. Taket (3 anslag/bildruta + 28 ms på väggklockan) är inte valfritt.

### 4. LYFTPLAN rad 9 — Bobo blir en rigg (`f419d4f`, v1.55.0)

`lib/karaktarer.js`: sju humör som ren data, fem reaktioner, blick, blink, andning. Första kund
`harma-melodin`, vars tre handritade Graphics och egen `_setMood` försvann — koden blev kortare.

### 5. LYFTPLAN rad 7 och 11 — rep och mjuka kroppar (`8bb208f`, v1.56.0 + v1.57.0)

`lib/rep.js` (verlet-tråd, kund `zackes-biltvatt`, −59 rader) och `lib/mjukkropp.js`
(tryck-soft-body, kund `lagerelden` — marshmallowen sjunker ihop på riktigt i stället för att
bara byta färg).

### 6. LYFTPLAN rad 12 — `p2-es` borttagen (`231caad`, v1.49.0)

Noll importer på två månader. Ett dokumenterat teknikval som ingen kod använder är en lögn om
appen. `ARCHITECTURE.md` nämnde den aldrig — docens A1 var inaktuell på den punkten.

### 7. ATGARDER V9 stängd — 32 spel fick kvitto (`8f2394c` · `560aa08` · `ddae3d8` · `8ed92fd` + v1.62.0)

Hela sondens lista genomgången i fem batchar, varje kandidat läst mot koden först.
**53 kandidater i 28 spel → 6**, och alla sex är medvetna undantag: fyra `_onUp` (ett uppsläpp
behöver inget kvitto, nedtrycket fick redan sitt) plus `pruttbad:733` och `vandkort:206`, båda
falska positiva och båda dokumenterade så ingen jagar dem.

Tre spel hade en kod-form som en mekanisk mönsterersättning hade brutit: `gungan._pumpDown`
tog aldrig emot `ctx`, `kittla-figuren._tickle` tar en zon i stället för ett event, och
`saftbaren` har ingen `ctx` alls i pekhanterarna (den ligger på `this._ctx`).

### Svitens flakighet — nu mätt, inte gissad

`npm run test:all` kördes **10 gånger** under natten. **3 av 10 gav `tom-scen`** i 1–3 spel,
alltid olika spel, aldrig ett spel som ändringen rörde, och alltid exakt 0,0 % innehåll. En
omkörning av IDENTISK kod var ren varje gång. Det bekräftar siffran CLAUDE.md redan angav
("HEAD flakade själv 1 av 3") och ger regeln: **två körningar av samma träd som skiljer sig är
icke-determinism, inte en regression** — `_ab.sh` behövs bara när HEAD och en ändring ska
jämföras.

En körning visade dessutom mekanismen: `fysik-svalt` med `deltaMS 100` (≈10 fps), och ett
`kulbana`-tryck vars `pointerup` kom **5 sekunder** efter `pointerdown`. Svälten skapar både
`tom-scen` och falska `dod-traffyta`.

⚠️ **Rättelse:** ett tidigare påstående i den här sessionen (och i `8f2394c`) om "39
kvarliggande Chrome-processer" var **fel** — det kom ur ett slarvigt `tasklist | grep -c chrome`.
Verklig mätning: 7 chrome.exe, varav 2 headless. Chrome-ackumulering förklarar ingenting här.
Det som däremot står: **två `npm run dev`/vite-instanser** kör mot samma repo (vite 5480 äger
5173, vite 4908 är föräldralös) och `.server.pid` pekar på en död PID.

### Metodfynd — natten handlade om sonder som ljuger

**Varje sond jag skrev fällde sig själv minst en gång, och varje gång på ett sätt som såg grönt
eller rimligt ut:**

- `_slagprobe` var **grön medan den inte mätte någonting**: den mätte `impactAudio` på en rasande
  hög, men 180 bildrutor simuleras på ~40 ms verklig tid, så väggklocke-spärren släppte igenom
  exakt en ton oavsett vad som hände.
- `_tystprobe` rapporterade **"0 kandidater i hela repot"** två gånger, av två olika regex-fel
  (bindningens kropp lästes fram till första `)`, och "nästa metod började" matchade `if (`).
- `_repprobe` **felade ärligt** och tvingade fram två riktiga fixar: en 20-punkterskedja med
  vilolängd 760 px blev 2870 px lång vid ett hårt drag.
- `_mjukprobe` hade **fel två gånger innan koden hade det**: först fel fall (ett mjukt föremål
  som hänger i toppen ska töjas ut — fysiken var rätt, testet fel), sedan fel mätstorhet
  (underkantens absoluta läge blandar ihop hoptryckning och dropp).
- Och **skärmdumpen** hittade det tabellen inte kunde: karaktärsriggens bryn gav `ledsen` och
  `forvanad` ARGA ansikten — en tillsägelse, alltså ett P0-brott — och `scale.x = −1` vände
  rotationens riktning så brynen blev osymmetriska.

**Eget misstag värt att komma ihåg:** jag redigerade `karaktarer.js` medan `test:all` körde.
Vite laddade om mitt i sviten, som kom tillbaka 68/72 med `gles-scen` på exakt 5,5 % i tre spel
— signaturen för en omladdad sida, inte för en regression. En omkörning orörd gav 72/72.
**Rör aldrig `src/` medan sviten kör.**

**Commits:** `231caad` p2-es · `5da515d` gamelog-domen · `1168e24` kvittera · `045d6f3` material ·
`35defca` peka-pa-kroppen · `3d30e32` tystprobe · `f419d4f` karaktarer · `8bb208f` rep ·
`69ea2bb` mjukkropp

**Öppet:**
- **`ATGARDER` är tomt** — V9 stängd, inga öppna ägarrapporter, inga öppna verktygsfynd.
- **Miljö att titta på:** två `npm run dev`/vite-instanser kör mot samma repo och `.server.pid`
  pekar på en död PID. Inte åtgärdat i natt — jag dödar inga processer på ägarens maskin.
- LYFTPLAN: rad 2 (`atlas.js`) är den enda kvarvarande ⬜. **Kunder saknas** för de nya libben:
  `karaktarer.js` 1 av 23 · `mjukkropp.js` 1 av 6 · `rep.js` 1 av 4 · `kamera.js` 0.
- `MeshRope` (C5) är inte byggd — den kräver en textur, och `generateTexture()` är den kända
  destabiliseraren. Vägen är Canvas2D-bakning som i `partiklar.js`.
- Oförändrat: `saknat-ljudklipp` i 4 spel (MOSS nere).

## 2026-08-09 · v1.48.0 · LYFTPLAN rad 6 klar + rad 3/A2 påbörjad — vätska och volym

**Byggt:** fyra omgångar. Två spel fick riktig vätska, och två omgångar gav spelobjekt och
stora ytor volym — allt utpekat av mätning, inte av magkänsla.

### 1. `vattenvagen` — riktig vätska (v1.45.0, `ccaef5c`)

`lib/vatska.js` (SPH + metabollar) driver vattnet på de tre ställen där det SYNS: kranens
stråle, läckan ur sista öppna porten, och muggen. **Inuti rören simuleras ingenting** — kanalen
är 26 px och röret ogenomskinligt, så vattnet sugs in i mynningen och kommer ut i andra änden
efter `140 + celler·95` ms. Den gamla "droppar längs en polylinje"-vägen är borta. Muggens
fyllnad läses som vattenYTANS höjd.

Fem fel som ett grönt test aldrig sett:
1. **Strålen var osynlig** — 49 partiklar, noll pixlar. En droppe faller ~480 px/s, så med
   saftbarens takt (145 ms) hamnar dropparna 70 px isär mot en 55 px klick: de överlappar
   aldrig, når aldrig metaboll-tröskeln och ritas i KANTfärgen (nästan vit) mot ljusblå himmel.
2. **Banan löste sig själv** — muggen låg i kranens kolumn, så läckan föll rakt i mål.
3. **Spillet åt partikelbudgeten** (132 och stigande) → `drain()` fick en `pal`-parameter.
4. **Fyra rader tryckte muggen bakom brickan och ur bild** från nivå 3 och uppåt. Banorna
   växer nu i bredd (4→6 kolumner), aldrig i höjd.
5. **Plantan blommade aldrig** — `this._plant.text = '🌸'` på en `Graphics` gör ingenting.

### 2. `golvet-ar-lava` — lavan blir ett föremål (v1.46.0, `5d69147`)

Bara flodens översta 46 px simuleras; djupet är samma ritade berg. Poängen är inte att lavan
rör sig snyggare utan att **varje sten bär en cirkelkollision**: lavan delar sig runt stenen,
kryper upp mellan stenarna, och en sten som DRAS över floden plogar lavan framför sig.
Stenens kollisionsradie är 28, inte 46 — med full radie steg ytan 35 px och nådde klippkanten.

### 3. `lib/foremal.js` — delad boll och stjärna i 8 spel (v1.47.0, `62b91db`)

`makeBoll` (5 spel) + `makeStjarna` (3 spel), byggda med `form.js`-fyllningar: A2 (dedupe) och
C1.3 (gradient på spelobjekt) i samma ändring. Glansellipsen är borttagen, inte kvarlämnad —
gradienten ÄR dagern. **Läsningen ändrade docens lista:** `makeBasket` ×3 är tre OLIKA korgar
och `makeBumper` ×2 två olika; att slå ihop dem hade tagit bort variation, inte en dubblett.

### 4. Volym på de stora ytorna (v1.48.0, `bce776d`)

Ny `scripts/_plattprobe.mjs` rankar de 72 skärmdumparna på största enfärgade fältet. Den pekade
inte på spelobjekt utan på marker och bakgrunder: `plantera-fron`s jord 301 300 px i en ton,
mullvadens gräsmatta 215 742, lavaklipporna 135 828, och **fyrverkeriets natthimmel var 48
staplade rektanglar** — samma mönster `scene.js` lämnade i rad 3, gömt i en spelfil. Ny
`verticalFill()` i `form.js`.

**Två mätfel värda att minnas:** (a) rankning på SUMMAN av platt yta är fel — en bakad gradient
kvantiseras till band, så summan STIGER av en korrekt fix (mullvaden 536 849 → 735 907) medan
största fältet föll 215 742 → 32 889. (b) **Platt är ibland rätt** — `spara-linjen` (ritpapper)
och `rulla-bollen-hem` (fotbollsplan uppifrån) toppar listan och ska göra det.

### Ett falskt flaky-alarm, dokumenterat som sådant

`_ab.sh` gav först lavaändringen **2 flakiga rundor av 8** (`glittergrottan:konsolfel` =
WebGL-kontext som inte kunde skapas, plus tom-scen i tre-fyra spel) mot HEAD 0 — exakt
signaturen från `generateTexture`- och `FillGradient`-fällorna. Två kostnadssänkningar gjordes
på den grunden (`FluidView.area` som kör filtret bara över den yta vätskan kan nå, och ett delat
metaboll-filter per sida i stället för per montering). Men i tredje körningen flakade **HEAD
självt** med `golvet-ar-lava:tom-scen`. Slutläge över **11 växelvisa rundor: HEAD 1, ändringen
2** — inte skiljbart. Ändringarna behölls för att de är billigare, inte för att de bevisligen
fixade något. Mekanismen jag först skrev in i koden var dessutom **fel**: `Filter.from` går via
`GlProgram.from`, som cachar per källkod. Kontrollerat i `node_modules/pixi.js` och rättat.

**Nya verktyg:** `scripts/_vatskeprobe.mjs` (partiklar · ytans höjd · målade pixlar mot vätskans
egen färg · FPS med CPU-strypning · exit + återinträde; hittar vätskan på FORM, inte fältnamn)
och `scripts/_plattprobe.mjs`. `GameHost` exponerar `window.__barnspel.ctx` i DEV så sonder kan
driva spelets egna metoder med den riktiga ctx:en.

**Commits:** `ccaef5c` feat(vattenvagen) · `5d69147` feat(golvet-ar-lava) · `62b91db`
feat(foremal) · `bce776d` feat(form)
**Kontroll:** `npm run check` 0 fel/0 varningar · `npm run test:all` **72/72** efter varje
omgång · FPS 56,7–56,9 vid CPU 6× strypt i båda vätskespelen (oförändrat mot tom scen) ·
`_idleprobe` 0 framsteg utan tryck i båda.

**Öppet:**
- **Bygget är inte kört/serverat den här sessionen** — `npm run build` + `npm run serve` och en
  runda på plattan återstår innan v1.48.0 kan kallas telefontestad.
- **Rad 3/A2 fortsätter.** Nästa mätta kandidater ur `_plattprobe.mjs`: `tarta-i-ansiktet`
  (132 675 px), `hamburgerbygget` (126 186), `enkelt-pussel` (111 539), `vart-tog-det-vagen`
  (184 874 — men kolla bilden först, en bordsskiva får vara platt). Och de 203 lokala
  rit-funktionerna i övrigt; sortera efter hur STORT föremålet ritas.
- **B1 har sex spel kvar** som fejkar vätska: `zackes-biltvatt`, `tvatta-djuret`, `pruttbad`,
  `trollblandning`, `plask-i-vattnet`, `pizzabageriet`. Mönstret och sonden finns nu.
- `rimLight` i `form.js` väntar fortfarande på sin första kund.
- Oförändrat sedan tidigare: MOSS nere (`kristall_klirr` + `duns` köade), p2-es-beslutet (rad 12)
  väntar på ägaren.

---

## 2026-08-09 · v1.44.0 · LYFTPLAN rad 5 — `lib/kamera.js` (app-brett, inget enskilt spel rört)

**Byggt:** kameran som gör rad 4:s **statiska** djupband till riktig parallax. `class Camera`
äger inga spelobjekt, bara **lager**: `parallax(faktor)` ger en Container där 0 = fastspikat i
skärmen (vinjett, HUD), 1 = spelarens plan, däremellan = bakgrund som glider långsammare.
Spelet bygger i faktor 1 och tänker i världskoordinater. `follow` · `moveTo` · `panTo` ·
`shake` · `zoomTo` · `attach(ticker)` · `destroy()`. Pekpunkter behöver ingen omräkning —
lagren är riktiga Pixi-containrar, så `varld.toLocal(e.global)` räcker.

`createScene(tema, { kamera: { bredd } })` delar scenen i tio djuplager och ritar **varje
lager exakt så brett som dess faktor kräver** (`lagerBredd(f) = vy + f·(värld − vy)`). Utan
flaggan är utfallet oförändrat: samma container, samma ritordning, samma bild.

**Tre fel som mätningen hittade — inget av dem gick att se i koden:**

1. **`hardBox` 0.42 satte resten av kameran ur spel.** Rutan klämmer mot målets läge varje
   bildruta, så en snäv ruta gör kameran klistrad vid figuren och låter dödzon, lead och
   fartsspärr bara verka inne i rutan. Nu 0.75. Priset är mätt och dokumenterat: en
   **teleport** rycker bilden med (3880 px på en bildruta) — ett spel som flyttar sin figur
   långt ska anropa `moveTo()` i samma andetag.
2. **Zoomen skalade varje lager med sin egen faktor** (`1 + (zoom−1)·f`). Det lät fysikaliskt
   och gled isär: vid zoom 1.4 hamnade markens horisont på skärm-y 874 och fjärranbandets på
   673. En zoom ändrar **brännvidd** — den flyttar inte lagren i förhållande till varandra.
   Det gör bara panoreringen, och den bär faktorn. Zoomen är nu uniform kring vyns mitt.
3. **Zoom-UT under 1 kräver marginal åt båda håll**, vilket `lagerBredd` (som bara ger
   marginal åt höger) inte ger. Zoom-IN är däremot gratis — vid 1.6 landar markens högerkant
   exakt på världens. Därför är `minZoom` 1 som golv, dokumenterat i stället för tyst trasigt.

**En gräns gjordes hörbar i stället för tyst:** scenens lager är låsta i höjdled, så en värld
med vertikalt utrymme skulle låta figuren glida av den ritade marken — synligt bara i rörelse,
aldrig i en stillbild. `adopt()` varnar därför i DEV när `worldH > vyns höjd`.

**Kostnad: ingen mätbar.** `_kamerabild.mjs --fps --cpu 6`: scen utan kamera 56,6 FPS, samma
scen i 10 parallaxlager med följning i rörelse 56,6 FPS.

**Nya verktyg:** `scripts/_kameraprobe.mjs` (beteendet i tal — dödzon, hård ruta, spärr, skak,
zoom, klämning, exit; kör i **Node utan webbläsare**, eftersom kameran bara rör
`.position`/`.scale` och Pixis Container laddar där) och `scripts/_kamerabild.mjs` (ett
kameraläge per ruta, maskad, plus `f<faktor>:x<offset>` per lager — en fin bild kan mycket väl
ha noll parallax, och `--fps` mäter kostnaden).

**Kontroll:** `npm run check` 0 fel/0 varningar · `_kameraprobe.mjs` allt grönt ·
`scripts/_ab.sh src/lib/scene.js --rundor 3` växelvis: **HEAD flakade 2 av 3** rundor
(`glittergrottan:tom-scen`, en gång även `konsolfel` + `golvet-ar-lava:tom-scen`),
**ändringen 0 av 3 — 72/72 rent i alla tre**. Utan HEAD-armen bredvid sig hade den enstaka
`tvatta-djuret:tom-scen` i den första sekventiella körningen sett ut som en regression.

**Öppet:**
- **Kameran har ännu ingen kund bland de 72 spelen.** Ingen befintlig `createScene`-scen rullar
  i sidled, och de två spel som har egen kamera vill ha något den med flit inte gör:
  `snobollen` härleder kamerans HÖJD ur backens yta (`camY = surfaceY(camX + LEAD)`) med backen
  ritad i skärmrymd. Att byta den mot generisk följning vore att tuna om ett fungerande spel
  utan synlig vinst. Första kunden blir ett **nytt** spel byggt för en värld bredare än rutan,
  eller en `/polera`-runda som medvetet ger ett spel en sådan värld.
- Rad 6 (`FluidWorld` → `vattenvagen` + `golvet-ar-lava`) är nästa i arbetsordningen.
- `setDetaljniva` saknar fortfarande en anropare i skalet (2 är hårdkodat).

---

## 2026-08-08 · v1.43.0 · LYFTPLAN rad 10 + rad 4 (app-brett, inget enskilt spel rört)

**Byggt:** två rader ur arbetsordningen, båda delade filer som lyfter många spel på en gång.
Inget enskilt spel ändrades — därför är `docs/games/*` orörda med flit; nuläget för de här
raderna bor i `docs/LYFTPLAN.md`.

**Rad 10 — volym på alla 121 ikoner** (`src/lib/artikoner.js`, 13 spel). Varje mallgren fyller
sin HUVUDFORM med en gradient efter en regel i stället för per-form-smak: `sphereFill` runda
kroppar, `cylinderFill` rör och stavar (ny `axis`-parameter), **ny `topLightFill`** för allt
annat (karosser, kläder, verktyg, polygoner). Smådetaljer lämnas platta med flit. Handrullade
glans-ellipser bredvid platta fyllningar är **borttagna**, inte kvarlämnade — det var samma
dubblett som gradienten ersätter. `setDetaljniva(0|1|2)` i `form.js` är kostnadsratten: på 0
returnerar fyllningsfunktionerna **råfärgen**, så ingen ritgren behöver en egen if-sats.
Accenter har dessutom en storleksgrind (≥64px).

**Rad 4 — djup i `scene.js`** (55 spel). Tre avståndsband bakom marken, disband vid horisonten
(ritat **mellan** band 1 och 2 — ordningen ÄR effekten), markstruktur i två lager, vinjett, och
`tid` (`morgon`/`skymning`/`kvall`) som en nyansparameter. Allt bakom egna flaggor och allt i
scenroten, alltså **bakom spelytan** — vinjetten kan aldrig mörka ner något barnet ska trycka på.
De tre banden ersätter gamla `hills` (två cirklar med radie 220–280 som läste som bleka bubblor).
Nytt temafält `gras` avgör strån eller prickar.

**Fyra mätningar som ändrade koden — inga av dem syntes i ett grönt test:**

1. **Radiella gradienter kostar 256× linjära.** Pixi bakar en linjär till `256×1` (~1 KB), en
   radiell till `256×256` (~256 KB). Ikonbiblioteket låg på **15,30 MB** GPU-textur;
   `textureSize: 64` tog det till **1,00 MB** utan banding ens på en 300px-ikon.
2. **En radiell gradient kan inte ha genomskinlig mitt.** `buildRadialGradient` fyller HELA
   duken med sista färgstoppet först; en genomskinlig källa raderar ingenting i source-over.
   Vinjetten blev en **jämn** mörkning (himlens mitt [176,227,250] → [146,189,208], samma
   faktor överallt). Nu fyra **linjära** kanttoningar — mitten pixelidentisk med baslinjen.
3. **En gradient per scen destabiliserade sviten.** Disbandets `FillGradient` byggdes inne i
   `createScene` = ny duk + texturuppladdning vid varje montering. `_ab.sh`: HEAD rent 3/3,
   ändringen `tom-scen` i 1 av 3 (tre spel samtidigt). Efter cache av **både** dis- och
   himmelsgradienten: HEAD 1/3 flaky, ändringen **0/3**. Himlen bakades om per montering redan
   före den här raden, så scenen gör nu färre texturbakningar än HEAD gjorde: noll.
4. **Två ikonbuggar.** 🌙 ritade en cream-cirkel ovanpå en hel måne för att få skäran —
   osynlig **bara** mot cream bakgrund. 🍐 var cirkel plus ellips, båda stroke:ade, så sömmen
   syntes och päronet läste som en snögubbe. Båda är nu egna slutna drag.
   `.cut()` fungerar INTE för månen: `GraphicsContext.cut()` bryter efter första instruktionen
   utan hål, så med `.fill().stroke()` fastnar hålet på konturen och fyllningen förblir hel.

**Tre saker byggdes, granskades i skärmdump och ströks** — de är resultat, inte glömska:
pälstofsar (blev bubblor med egen kontur på kanin/panda/pingvin), kantdager som ljus båge
(mjuk vid 130px, hårt streck tvärs över pannan vid 300px), och separat ocklusion (gradienterna
mörknar redan mot underkanten). Strån på `water` var samma sort av fynd: de såg ut som skräp
i sjön och blev prickar i stället.

**Nya verktyg:** `scripts/_ikonkostnad.mjs` (vad gradienterna kostar i GPU-minne — mäter de
**bakade texturerna på ritinstruktionerna**, inte modulens cache-räknare, eftersom ett probe
får en annan modulinstans än appen), `scripts/_scenbild.mjs` (`createScene` i rutnät utan att
gå via ett spel). `scripts/_ab.sh` tar numera filer som argument + `--rundor`.

**Commits:** `540fb18` feat(artikoner) · `d6fe304` feat(scene) · `67fbcdf` feat(artikoner, början)
**Kontroll:** `npm run check` 0 fel/0 varningar · `npm run test:all` **72/72 gröna**, inga
fel-nivåfynd · skärmdumpar granskade per tema (sky meadow water candy sunset night warm).

**Öppet:**
- **Rad 5 `lib/kamera.js`** är nästa i ordningen — och det är den som gör rad 4:s **statiska**
  djupband till riktig parallax. Banden är byggda redo för det.
- `setDetaljniva` har ingen anropare ännu; den behöver en inställning i skalet för att bli
  verklig (2 är hårdkodat).
- Rad 3:s rest / A2: de 205 lokala rit-funktionerna i spelfilerna. Största kvarvarande visuella
  vinsten; `artikoner.js` är nu mallen att kopiera.
- Rad 12 **`p2-es`** väntar fortfarande på ett ägarbeslut.

---

## 2026-08-08 · v1.39.0 · 🎉 Projektgenomgång + partikelsystemet (app-brett, inget enskilt spel)

**Byggt:** ägaren bad om en genomgång av helheten — hur allt hänger ihop (assets, funktioner,
motorer), var fysiken är underutnyttjad, och hur grafiken kan bli bättre. Resultatet är ett
**mätt** planeringsdokument plus första raden i arbetsordningen byggd.

**`docs/LYFTPLAN.md`** — tre spår (A integration · B fysik · C rendering) och en 12-radig
arbetsordning. Allt är räknat, inte uppskattat, mot v1.38.0:

- **`FillGradient`, `ParticleContainer`, `generateTexture`, `cacheAsTexture`, `Mesh`/`MeshRope`,
  `TilingSprite`, `BitmapText` = 0 användningar i hela appen.** 1461 `new Graphics()`-anropsställen
  i spelen och **noll** `Sprite`. Himlen i `scene.js` är 48 staplade rektanglar.
- **205 unika lokala rit-funktioner** i spelfilerna mot **8** delade. Dubbletter redan mätbara:
  `makeBall` ×5, `makeStar` ×3, `makeBasket` ×3, `makeElvira` ×2 (en i `figurer.js` OCH en lokal).
- **`p2-es` är en död dependency** — noll importer, men står som låst teknikval i `CLAUDE.md`,
  `ARCHITECTURE.md` och skill `fysik-spel`. Dokumenten lovar fyra motorer, appen kör två.
- **SPH-vätskan (`vatska.js`, 739 rader, 6 material) används av 1 spel** av åtta möjliga
  (`vattenvagen` säger rakt ut i sin header att vattnet INTE är fysik). `three3d.js`: 1 spel.
- **Mjuka kroppar: 0.** `Composites` används aldrig. `lagerelden`s marshmallow som sjunker ihop
  när den blir varm ÄR spelets mekanik och är idag bara ett färgbyte.
- Bobo finns i **29** spel men `makeMascot()` är ett statiskt huvud utan uttrycks-API — därför
  handrullar alla 29 sina reaktioner. Det *är* mönstret "ingen mottagare" i `docs/games/README.md`.

**Rad 1 byggd: `src/lib/partiklar.js`.** Canvas2D-atlasark + ETT `ParticleContainer` per lager +
EN tween per svärm (analytisk rörelse). `feedback.js` (`puff`/`burst`/`sparkle`/`bigCelebration`)
går den vägen med Graphics-vägen kvar som fallback. **Alla 72 spel fick 3× partikeltäthet utan
att ett enda spel ändrades.** Mätt kostnad (CPU 6× strypt): gamla vägen viker vid ~2 000 samtidiga
partiklar (43,5 FPS), nya håller 56,5 FPS vid ~21 800.

**Två fällor kostade en hel felsökningscykel var — båda nu i `CLAUDE.md`:**

1. **`generateTexture()` destabiliserade sviten, inte spelet.** Första versionen bakade arket med
   Pixi Graphics. `test:all` gav `tom-scen` i **5 av 7** körningar (0 av 7 på HEAD) + en
   WebGL-kontextkrasch i `glittergrottan`. Förbakning vid uppstart hjälpte inte. Canvas2D rör
   inte GL-tillståndet. `lib/atlas.js` byggdes för detta och **revs igen** — oanvänd kod är samma
   skuld som `p2-es`.
2. **Ett cachat fält på `fxLayer` dör aldrig** (app-långlivat lager). Canvas2D med kvarliggande
   fält flakade 1 av 3; `stad()` som river tomma fält → **0 av 4**.

Metod värd att återanvända: `scripts/_ab.sh` (HEAD mot ändringen **växelvis** i full skala — en
delmängd på 8 spel var ren medan 72-svitens last flakade, och sekventiellt före/efter är
förorenat av maskindrift). `scripts/_fpsprobe.mjs` **kräver CPU-strypning** — ostrypt pinnar både
gamla och nya vägen mot 60-taket och mätningen säger ingenting.

Sonden fick fel två gånger innan koden fick det (*verifiera sonden innan du tror på ett rött
resultat* — samma stående regel som `CLAUDE.md` och tidigare sessioner): den första
tryckte på fasta punkter i ett spel med *svävande* ballonger, träffade inget, och dömde ett
fungerande system som dött; och en `import('/src/lib/atlas.js')` på bar sökväg är en **annan
modulinstans** än appens `?t=`-suffixade HMR-kopia, så den rapporterade `hasRenderer: false` om en
registrerad renderare.

**Commits:** `9a471d1` feat(partiklar): ParticleContainer-system, 3x tathet i alla 72 spel + LYFTPLAN

**Öppet:** LYFTPLAN rad 3–12. Nästa naturliga steg i ordning: **rad 3** `FillGradient` i
`scene.js` + nytt `lib/form.js` (radiella gradienter ger volym åt varje föremål — störst utseende
per rad), **rad 4** fördjupad `scene.js` (parallaxband, dis, vinjett — lyfter 57 spel), **rad 5**
`lib/kamera.js`. **Beslut som kräver ägaren: rad 12, `p2-es`** — bygg ett spel som behöver den
eller ta bort beroendet och stryk påståendet i de tre dokumenten. Sedan tidigare öppet: ATGARDER
**V8** (första trycket i ett spel får aldrig sitt ljudklipp — `_predecodeAll` startar vid samma
`pointerdown` som ska låta), `glittergrottan` §4 principfacit, `natskott` §4, MOSS nere
(`kristall_klirr` + `duns` köade). Röstkön tom.

---

## 2026-08-08 · v1.38.0 · 🕸️ Nätskott på stan: tre händer, nätbollar och en gata som svarar

**Byggt:** `/polera natskott-pa-stan` omgång 2 — ägarens sex beställningar i ett svep. Tre
`spelbyggare`-agenter parallellt (monsterarter · butiksfasader · gatuobjekt) medan jag byggde
styrningen. Modulen växte 2 063 → 6 200 rader.

- **Växelknappen är borta.** Spelet styrs av **tre näthänder**: den aktiva är armen mitt i bild,
  de två andra ligger och väntar nere i vardera hörnet. Tryck på en och den kliver fram. Alla
  tre har samma pose — det är dräkten som är språket (röd/svart = dragnät, vit/lila = fästnät,
  svart/rött = nätboll).
- **Nätbollar:** matter-kropp som flyger och studsar (mätt 652 px, 3 studsar, tak 3 i luften).
  Träffat mål **snärjs in** — faller, lägger sig ner, får en vit nätboll runt kroppen så bara
  huvud och fötter sticker ut, och går fortfarande att dra hem.
- **Handposen tog fem försök.** Framifrån läste som en KANIN gång på gång. Insikten som löste
  det: en lodrät spegelaxel plus två utstickande delar blir ALLTID ett ansikte — samma fälla som
  butiksagenten gick i när cykelbutikens ruta med två symmetriska hjul lästes som ögon. Jag
  byggde tre kameravinklar, renderade dem sida vid sida (`_handval.mjs`) och lät ägaren peka.
  Profil vann. Alla tre finns kvar bakom `HAND_VINKEL`.
- **Baksätet** blev en bilinteriör — och flyttades BAKOM dörrkanten. Ritordningen var hela
  skillnaden: ovanpå bilen läste samma former som en soffa parkerad på trottoaren.
- **12 monsterarter** · **6 butiksfasader** (~1 av 3 hus, med krossbara rutor) · **11 gatusaker**
  med 33 reaktioner, tre per sak — brandposten sprutar en räknad kastbana, brevlådan spottar ut
  brev, dörren öppnas och ett monster vinkar, äpplen ramlar, korven far upp i luften.

**Tre buggar sonderna hittade som gröna test aldrig sett:** `_phys.link` skriver
`view.rotation = body.angle` varje bildruta, så tweenen på det liggande insnärjda målet nollades
tyst (rotationen ligger nu på `inner`) · nätbollen snärjde in det som råkade gå förbi framför
bilen i födelseögonblicket i stället för det man siktade på · butiks- och gatublocket
deklarerade **båda** `ritaCykel`, en dubbeldeklaration som hade dödat hela modulen.

**Kritikern fällde två av mina påståenden:** `_natprobe.mjs` tryckte fortfarande på
växelknappens borttagna koordinat och trodde i 150 s att spelet vägrade byta nät — spelets
viktigaste sond var tyst trasig. Och min kommentar om träffytan räknade i LOKALA tal: `hitArea`
skalas av containerns `SIDO_SKALA`, så 236×320 var 118×160 på skärmen. Ytan är höjd till
130×180 och sonden mäter i skärmpixlar nu.

**Commits:** `ff963da` feat(natskott-pa-stan) · (denna: docs + version)
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **72/72** · `_bollprobe` ·
`_gatuprobe` · `_repprobe` · `_natprobe` (hel runda 60 s + exit mitt i firandet) ·
`_idleprobe` 0 — alla gröna. **Prestanda oförändrad: 17,97 ms snittruta och fps 56, exakt
samma som baslinjen före omgång 1.**
**Öppet:** natskotts §4 — hemkomsthuset som lever, natt/regn-kulisser, uppdrag som använder de
NYA systemen (nätbollen ger ingen uppdragskredit i dag), krossbara skyltfönster (kräver ett
genomskinligt läge i `_drawWindow`), fler tjuvbeteenden. ATGARDER **V8** kvarstår: `thwip`
saknar klipp så varje skott faller tillbaka på `whoosh`. MOSS nere.

---

## 2026-08-08 · v1.37.0 · 🕸️ Nätskott på stan polerat — repet blev ett rep, monstren blev en familj

**Byggt:** `/polera natskott-pa-stan` på ägarens beställning (fem punkter), plus två
verktygsfynd ur ATGARDER avklarade tidigare på dagen.

- **V6 + V7 fixade** (`e219f19`, `1160ad1`): `npm run sfx` byggde om sfx-manifestet ur sin egen
  fraslista och tappade tyst Kenney-nycklarna `tap`/`soft`/`flip` → manifestet byggs nu ur
  `out_dir.glob('*.mp3')`, alltså ur filerna på disk (mätt om med MOSS nere: 24 klipp, varav 3
  från andra källor). `vandkort` sa havsdjursnamn utan klipp — fyndet gällde ett namn, hålet var
  elva: hela `SEA_NAME` saknades. Mätt statiskt ur spelets egna tabeller i stället för att hoppas
  på rätt slumpat tema: 18 unika namn, 0 utan klipp.
- **Poleringen** (`9a38180`): nätlinan är en **verlet-tråd** i stället för en ritad kurva;
  dragnätet **vinschar i vevtag** så hemfärden blir ryck–släpp–ryck; monstren är en **familj på
  sex arter** inkl. ägarens **goblin i grönt med lila mössa**; **fönstermonstren går att fånga**
  med båda näten; och ett monster **snor paket** som motgång med hårt tak.
- **Vevmodellen tog fyra mätrundor.** Jämn indragning gav 0 ryck (kroppen sprang ifrån vinschen).
  Snabbare vev gav motsatsen — spänt rep hela vägen. Slumpad vevfas ur `rec.seed` gjorde att
  SAMMA avstånd gav 0 eller 2 ryck olika gånger → egen vevklocka per fångst. Och till sist räckte
  ett enda vevtag hela vägen hem på nära mål → farttaket skalas mot avståndet. Ny sond:
  `scripts/_repprobe.mjs`.
- **Kritikern fällde två saker jag trodde var klara:** kodkommentaren lovade "2–3 ryck" när
  mätningen gav 0–1 (kommentaren säger nu exakt vad sonden mäter), och första omtaget av
  handposen lästes fortfarande som ett fredstecken — två uppåtriktade fingrar ÄR ett V oavsett
  vinkelskillnad. Lillfingret pekar nu nästan vinkelrätt ut.
- **Agenten som ritade monstren lämnade över två risker** som visade sig vara äkta: arten
  tappades mellan gatan och baksätet (`_seatList` bär nu `{kind, golden, art}`) och flaxis vingar
  stack bara ut 13 px förbi öronen (breddade 24 % efter skärmdumpen). Dess egen bildsond hittade
  också en fördelningsbugg som dess gröna geometrisond var blind för — samma läxa som repots.
- **Ny sond `scripts/_monsterbild.mjs`** ställer upp alla sex arter i det RIKTIGA spelet och tar
  en skärmdump (`.test-shots/natskott-monster.png`). Agentens verifiering gick genom en egen
  Pixi-stubb; bilden är beviset.

**Commits:** `e219f19` fix(sfx) · `1160ad1` fix(vandkort) · `9f7222b` docs(ATGARDER) ·
`9a38180` feat(natskott-pa-stan) · (denna: docs + version)
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **72/72** · `_natprobe` full runda +
exit mitt i finalen 0 konsolfel · `_idleprobe` 0 · prestanda oförändrad (17,97 ms snittruta
före och efter, baslinje i `.test-logs/_natskott-HEAD-baslinje.txt`).
**Öppet:** ATGARDER **V8** (nytt): första trycket i ett spel hinner aldrig få sitt ljudklipp —
`AudioService` börjar avkoda först vid första `pointerdown`. Kvar i natskotts §4: hemkomsthuset
som lever, fler kulisser, fler uppdragstyper, fler tjuvbeteenden. MOSS fortfarande nere
(`kristall_klirr` + `duns` i kön).

---

## 2026-08-08 · v1.35.0 · 💎 Glittergrottan polerad till ✅ — 🔧-backloggen är NOLL

**Byggt:** `/polera glittergrottan` (sista 🔧-spelet). Alla §4-punkter utom principfacit:
kamera-drift på idle (±17/11 px, somnar vid tryck — mätt 15,9 → 2,3 px), kub som tredje
formgrupp vid n=6 (mätt 2/2/2, kuben sist), glimmerdjuret heter **Glimma** (presenterar sig
vid första klappet + jublar med namn varannan runda, 4 nya F5-TTS-klipp), tända kristaller
klirrar (stämd C7/E7/G7-syntes tills MOSS är uppe), melodin börjar på slumpat skalsteg,
dimman från nivå 1/~10 s.

- **P0-fix ur skärmdumpen (inte ur docen):** första kristallen kunde gömma sig BAKOM Glimma
  — nedre vänstra platsen på x≈278 mot djurets hit-kant x≈286. `_avoidPet()` håller låga
  platser på x≥396. Docens §5 påstod att avstånden var mätta; det gällde inte petzonen.
- **Kritikfynd (5/5-sviten håller):** slumpat z-djup ±60 gav upp till ~16 % skenbar
  storleksskillnad — lika mycket som storleksregelns eget steg vid n=6, så "minsta" kunde SE
  större ut. Storleksregler kör nu nästan platt djup (±12).
- **Två lib-buggar uppmätta med ny sond (`scripts/_glitterprobe.mjs` — spelar nivå 0→13):**
  (1) `forceContextLoss()` i ThreeLayer.destroy fick Chrome att BLOCKERA nya WebGL-kontexter
  — andra inträdet kraschade med tom scen. Renderern återbrukas nu mellan instanser.
  (2) Vid kontextförlust no-op:ar render() och nya meshar fick aldrig matrixWorld → pick()
  missade dem trots rätt position (mwPos [0,0,0]; pick 0 → 2 efter updateMatrixWorld).
  Ticken uppdaterar matriserna explicit — spelet överlever flikbyte/GPU-reset spelbart.
- **Sondfällor (två nya):** med ThreeLayer finns TVÅ canvasar — `querySelector('canvas')`
  ger three-canvasen (pointer-events: none), trycken måste till den SISTA (Pixi). Och en
  sond som importerar spel-URL:en själv får en ANNAN modulinstans när Vite HMR-stämplat
  modulen — GameHost exponerar nu `window.__barnspel.game` (DEV-only).
- **Verktygsfynd → ATGARDER:** `npm run sfx` tappar tyst Kenney-nycklarna (tap/soft/flip)
  ur sfx-manifestet (V6, manifestet återställdes före commit) · `vandkort` säger "Delfin!"
  utan klipp (V7).

**Commits:** 9321376 feat(glittergrottan) · (denna: docs)
**Öppet:** 🔧-backloggen tom — alla 72 spel ✅. Kvar i glittergrottans §4: principfacit
[Medium]. ATGARDER V6 (gen-sfx-manifestet) + V7 (vandkort-klipp). MOSS nere: `kristall_klirr`
+ `duns` väntar i sfx-kön.

---

## 2026-08-08 · v1.34.0 · 🚙 Nätskott på stan — 72:a spelet, bibliotekets första förstapersonsspel

**Byggt:** `/spel natskott-pa-stan` efter ägarens spec-ja (meddelandet "ja" på session 4-korten).
Alla åtta ägarbeslut ur IDEER.md implementerade ordagrant. `spelbyggare` byggde hela modulen
(~1900 rader); `spelkritiker` grindade före commit.

- **Spelet:** förstaperson ur bilfönstret — Spindel-Zackes arm i webb-pose, parallax i tre djup
  (stad→förort), tap → nät (thwip + rekyl <100 ms), stor växelknapp: klibbnät fäster målet där
  det är, dragnät drar hem det **synligt genom luften** till baksätet (kritikern mätte genom fem
  skärmdumpar — ingen teleport). Uppdragsrundor ikon-först som kräver båda näten; fönster krossas
  och självlagas (max 2, monster vinkar ur hålet); vindby + skata med tak; guldpaket ~1/8;
  hemkomst-parad som final. matter.js.
- **Kritikerns blockerare:** 0 av 8 röstklipp inspelade — spelet talade robotröst rakt igenom.
  `npm run voice` genererade alla 8 (inkl. "Hämta hem tre ballonger!" som byggaren korrekt lade
  till utöver spec-listans 7 — ballonguppdraget saknade replik).
- **Åtgärdat ur kritiken:** gatan töms när bilen bromsar (strövare stod bredvid paradfigurerna
  i finalen); vindby-strecken förankras vid paketen och lossningen sker när strecket når fram
  (orsak → verkan synlig); byggarens sond hade ett **dött fält** (`seen.gust` sattes aldrig —
  rapporterade alltid false utan att mäta) — mäter nu spelets `loosened`-flagga.
- **Bildläxa åt andra hållet:** hemkomst-dumpen såg ut att ha kvarglömda strövare kvar TROTS
  städfixen — mätning (`[hemkomst] mål på gatan: [] säte: 11`) visade att "strövarna" var
  paradvänner **mitt i språnget** ur sätet. En skärmdump kan även larma falskt; mät innan fix.
- Kvar i spelets §4 (medvetet): hand-posen läser som V-tecken, dubbelkredit för åter-klibbat
  paket (gör bara lättare), hemkomst-huset reagerar inte på paraden.

**Mätt:** `scripts/_natprobe.mjs` full runda 40–43 s, exit mitt i finalen + återinträde 0 fel ·
`_idleprobe` 0 · `npm run check` 0/0 · `npm run test:all` **72/72** · bygge rent · serverat på
:4173 + Tailscale 8445 (mobiltest). **Commits:** `089bc50` feat(natskott-pa-stan)
**Öppet:** 🔧-backloggen: `glittergrottan` (kamera-drift). `mata-munnen` väntar på fotoshooten
(ägarens uppgift — 19–20 bilder + 9 ljud enligt IDEER.md-listan). Röstkön tom.

---

## 2026-08-07 (natt 4) · v1.33.0 · 🕸️ Spindel-Zacke: spök-båge + kramscen — 🔧-backloggen nere på 1

**Byggt:** `/polera spindel-zacke-svingar` — backloggens två kvarvarande [Deep]-punkter
(spök-båge + nivå-intro). Spelet är nu ✅; kvar som 🔧 är bara `glittergrottan` (kamera-drift).

- **Spök-båge:** 📏-trycket ritar en prickad bana ur **samma integrator som flykten**
  (G/L/AMP, dt=1 — förhandsvisningen kan inte ljuga) med landnings-ring, tonar bort ~2 s.
  Sonden mäter Lång maxX 781 vs Kort 676 (+105 px). Längd-valet är äntligen läsbart.
- **Mini-berättelse + egen vinstscen:** "Kattungen sitter fast på taket!" + riktigt jam vid
  mount; vid mål landar Zacke på taket, Elvira springer fram i skutt och kramar (❤️ + match),
  kattungen jamar och hoppar upp i famnen — **sedan** delat firande. `complete()` sist så
  spelets replik inte klipps (biltvätt-läxan). "En kattunge till behöver hjälp!" driver vidare.
- **Elvira har hållit i en osynlig käpp sedan hon skapades** — `arc()` efter `fill()` utan
  `moveTo` strokar en implicit linje från origo (fötterna) till leendets start. Synlig i varje
  skärmdump, sedd först när kramscenen satte henne i fokus (kritikern hittade + pixelverifierade
  den). Samma fälla låg i Zackes leende. Ny fallgrop att känna igen.
- **Skärmdumpen avslöjade en fryst nättråd:** `_update`-ticken som anropar `_attach` fortsätter
  till `_drawWeb()` längst ner — `_resolving` kollades bara i funktionstoppen, så tråden ritades
  om EFTER att vinstscenen rensat den. Vakt i `_drawWeb`.
- **Sonden var trasig först** (probe-before-believing höll): `waitForFunction` med
  **async**-predikat returnerar en Promise-handle — alltid truthy → falsk träff direkt, 0 släpp.
  Synkront predikat via en engångs-exponerad singleton-referens. Sedan 7/7: spelaren når målet
  med 2 riktiga tajmade mustryck, exit mitt i kramscenen 0 fel.
- **"Kort nät!" har aldrig kunnat få ett klipp** — ternären `say(x ? 'Långt nät!' : 'Kort nät!')`
  är osynlig för check.mjs statiska literal-läsning. Kritikern fann den; klippet genererat nu
  (+ de två nya replikerna). P0-fix: tryck under flykt gav gnistor men inget ljud.

**Mätt:** `scripts/_svingprobe.mjs` **7/7** · `npm run check` 0/0 · `npm run test:all` **71/71**
· bygge rent · serverat på :4173. **Commits:** `fa7e45c` feat(spindel-zacke-svingar)
**Öppet:** **1 spel kvar som 🔧** — `glittergrottan` (kamera-drift). Röstkön tom. Spec-korten
`natskott-pa-stan` + `mata-munnen` väntar fortfarande på ägarens ja (mata-munnen även på
fotoshooten). Medvetet lämnat i spindel-zacke: superhjälte-pose i flykten, vind-sus,
stigande tak, räddningsgalleri.

---

## 2026-08-07 (session 4) · v1.32.0 · 🧠 Planering: ansiktssektionen + nätskott — noll kod

**Byggt:** ingen kod — en ren planeringssession, allt landade i `docs/IDEER.md`.

- **Ansiktssektionen detaljerad av ägaren:** rigg = frilagt porträtt i **två halvor** (delning
  vid överläppen), nedre halvan translateras för gap/tugg/prat; **endast neutralfotot klipps**,
  grimaser är helbildsfoton som korsbleknar; ögonlager i 8 riktningar följer det man drar;
  bus = mat som fastnar på ansiktet och blir gegga. Beslut (via frågerunda med ägaren):
  karaktären heter **"Pappa"** (roll, inte namn — theme.js-regeln får tillägget i samma commit
  som sektionen), bara ägarens ansikte nu, mål = mättnadsmätare med tallriksrundor, ligger i
  Roligt tills sektionen har 2–3 spel, webp ≤3 MB.
- **Fotoshoot-listan låst:** 19–20 bilder + 9 ljudinspelningar i EN session (stativ, samma
  ljus/vinkel), leverans till `assets-src/ansikte/pappa/`. **Ägarens uppgift — blockerar
  bygget av `mata-munnen`.**
- **`egna-ansikten` utbruten som egen idébankspost** (fota ansikten + spela in röst i
  telefonen): P0 DATA-lagringsfrågan måste utredas först; byggs tidigast när riggen och minst
  ett spel finns.
- **`natskott-pa-stan` planerad:** beslut — fönster **krossas på riktigt** (ägarens uttryckliga
  val mot rekommendationen; P0-tonen hålls med självlagning ~5 s + monster som vinkar ur
  hålet), inga människor (djur/monster/föremål), uppdragsrundor som mål, stor växelknapp för
  klibb/drag, antydd bilram, mottagare = baksätet, matter.js.
- **Båda spec-korten står i sin helhet i IDEER.md** under respektive post.

**Mätt:** `npm run check` 0/0 (inga spel rörda, ingen versionsbump — inget app-synligt ändrat).
**Commits:** se git-loggen (docs(ideer) + docs sessionslogg).
**Öppet:** **Båda spec-korten väntar på ägarens ja.** `natskott-pa-stan` har inga beroenden och
kan starta med `/spel` direkt vid ja; `mata-munnen` väntar dessutom på fotoshooten. Kvar sedan
tidigare: 2 spel som 🔧 (`spindel-zacke-svingar` spök-båge + nivå-intro · `glittergrottan`
kamera-drift). Röstkön tom.

---

## 2026-08-07 (natt 3) · v1.32.0 · 🛁 Pruttbadet: varje runda ett nytt bad och ett nytt fynd

**Byggt:** `/polera pruttbad`. Spelet hade **inga öppna [Deep]-punkter** — dess 🔧 var ett
**kvalitetsomdöme** från `spelkritiker`: variation och mjuk progression endast delvis uppfyllda
"så länge rundorna ser identiska ut". Omgången riktade sig rakt mot det omdömet.

- **Badsort per runda:** bubbel (blått) → jordgubb (rosa) → blåbär (lila) → citron (gult) →
  mint (grönt). Vatten, vattentoning och skum byter färg, och rundan säger sitt namn.
- **Gömt fynd i skummet:** en ritad badleksak (båt/stjärna/fisk/badboll/krabba, cyklar per
  nivå) ligger dold 35–80 % upp. Skummet stiger förbi → gnistor, `reveal`-ton, replik.
- **Skärmdumpen avslöjade en bugg inget test såg:** rosa skum över blått vatten under hela
  firandet. `_level` ökar direkt när rundan klaras men karet målas om först 1,5 s senare, och
  skummet läste nivån *live*. Badsorten ligger nu på ett enda ställe och allt byter samtidigt.
- **Blockeraren `spelkritiker` hittade:** nästa rundas fynd avslöjade sig självt direkt i
  **3 fall av 4**. Firandets pruttsvärm driver skummet långt förbi målet (mätt 350–450 mot ett
  nytt mål på 88), och nästa runda placerar sitt fynd innan skummet hunnit tömmas — leksaken
  gungade synligt i ett tomt kar. Fyndet **armeras** nu: skummet måste först ha setts *under*
  det. Det är oberoende av all tajming, till skillnad från en `_resolving`-spärr.
- **Fjärde gången i rad missade min sond den verkliga bristen.** Den testade bara via
  `setLevel` + sidladdning — alltså alltid via `init()` där skummet är 0 — aldrig en **levande**
  vinst → ny runda. Kritikern skrev en egen sond som spelade den riktiga vägen och mätte 3/4.

**Mätt:** `scripts/_badprobe.mjs` **8/8 ×3** · `npm run check` 0/0 · `npm run test:all` **71/71**
· 0 fynd i loggen · bygge rent. **Commits:** `5fda2fe` feat(pruttbad)
**Öppet:** **2 spel kvar som 🔧** — `spindel-zacke-svingar` (spök-båge + nivå-intro) ·
`glittergrottan` (kamera-drift). Röstkön tom.

---

## 2026-08-07 (natt 2) · v1.31.0 · 🛁 Kladdlera gör verktygsvalet äkta

**Byggt:** `/polera tvatta-djuret` — spelets sista äkta [Deep]-punkt, "Smutsiga zoner med olika
behov". Förut krävdes båda verktygen *globalt* (`renhet = 0,6·skrubbat + 0,4·sköljt`) men aldrig
ett val om **vilket** verktyg som skulle användas **var** — det var samma svep två gånger med
olika partikel.

- **Två lersorter.** Torr lera (varm brun, matt) skrubbas som förut. **Kladdlera** (kall
  skifferblå, blank dager + rinnande droppe) biter svampen inte på — duschen **mjukar upp** den
  till vanlig lera, och då biter svampen. Klumpen guppar segt och får en **egen låg ton**, inte
  samma `soft` som en lyckad skrubb, så örat hör skillnad på "det lossnade" och "den sitter fast".
- **Zoner, inte prickar.** Första versionen slumpade kladd i.i.d. per ruta. `spelkritiker`:
  det läser *prickigt* snarare än "ett annat material HÄR" — och då är det inget verkligt val.
  Nu 1–3 zoner per djur, aldrig över ansiktet. Skillnaden syns direkt i skärmdumpen.
- **Färgen valdes mot en krock.** `DARKMUD` betyder redan "dubbelt lager, skrubba två gånger".
  En mörkbrun kladd hade alltså burit **två olika regler i nästan samma färg** — därför kall
  slate. Första utkastet var mörkbrunt och gick inte att skilja åt i skärmdumpen.
- **Blockeraren `spelkritiker` hittade:** `_idleCue` valde närmaste fläck oavsett sort och sa
  alltid "dra svampen". På en bana med upp till 40 % kladd kunde **spelets egen hjälp säga fel
  handling** i precis det ögonblick barnet pausat och behöver den mest. Åtgärdad.
- **P0 MOTGÅNG hålls:** tak på andelen, nivå 0 helt kladdfri, duschen inte längre låst bakom
  70 %-regeln när kladd finns (annars vore fläckarna olösbara), mätaren går aldrig bakåt.
- **Sonden var fel tre gånger till.** Den grep verktyget 200 ms efter släpp medan det glider
  hem på 400 ms (→ "svampen biter inte" såg ut som en spelbugg), och den mätte "auto-hjälpen
  når 100 %" fast hjälpen medvetet tar **en fläck per 9 s** — 128 fläckar = ~19 min. Rätt
  egenskap att mäta var att kladd inte **låser** hjälpen.

**Mätt:** `scripts/_tvattprobe.mjs` **8/8** · `npm run check` 0/0 · `npm run test:all` **71/71** ·
bygge rent. `spelkritiker`: inga blockerare kvar.
**Commits:** `8a55054` feat(tvatta-djuret)
**Öppet:** **3 spel kvar som 🔧** — `spindel-zacke-svingar` (spök-båge + nivå-intro) ·
`glittergrottan` (kamera-drift) · `pruttbad` (variation/progression). Röstkön tom.

---

## 2026-08-07 (natt) · v1.30.0 · 🎠 Elvira galopperar över regnbågen

**Byggt:** `/polera enhorningen-elvira` — spelets sista äkta [Deep]-punkt. Vinsten var en 0,4 s
förflyttning + `pop` + **samma `bigCelebration` som alla andra 70 spel**; grindpunkt 7 föll
alltså rakt av efter en genuint fin klättring.

- **Finishen:** hon hoppar fram till regnbågens vänstra fot, gnäggar med ett riktigt
  `djur_hast`-sample och **galopperar längs regnbågens egen båge** över krönet — samma
  parametrisering som `makeRainbow` ritar bandet med, radie 142 mot bandets 116, så hon rider
  ovanpå den och lutar med den. **Varje åttondel av bågen spelar nästa ton i en pentatonisk
  skala — galoppen ÄR melodin**, inte ett ljud ovanpå en animation. Glitterspår, tänd regnbåge,
  flarande krönstjärna, och ett **föl** på gräset som hoppar och möter henne.
- **Fölets placering tog fyra försök — och tre av dem var osynliga i ett grönt test.**
  Höger fot: Elvira ritas efter fölet och **dolde det helt vid landningen** (10 px). Vänster
  fot: flyttade bara krocken till galoppens *start*, som börjar där (28 px). Fast offset under
  målet: regnbågen stiger med nivån, så fölet blev svävande på nivå 8. Till slut **marken** —
  den enda punkten som är oberoende av både bågen och nivån. Och även då: rakt under regnbågen
  står fölet **bakom kontrollpanelen**, bara huvudet stack upp. Det syntes bara i skärmdumpen.
- **Två gånger i rad mätte min sond fel sak.** Förra passet: prickbanans *förutsagda* slutpunkt
  var 1 px från målet — grönt — medan `predictTrajectory` inte känner studsmoln alls. Den här
  gången: sonden mätte att fölet *fanns och låg innanför skärmen*, inte att det **syntes** när
  hon kom fram. Båda gångerna hittade `spelkritiker` hålet. Lärdomen är skriven i minnet:
  **fråga vad mätningen INTE täcker.**
- **Sonden testade dessutom fel nivå i tre körningar.** `goal.x` vandrar 1010→1170, så högra
  regnbågsfoten (1286) hamnar utanför 1280-ytan och galoppen red ut ur bild — men bara på höga
  nivåer. `highestLevel` via `localStorage` + reload räckte inte: `SaveService` flushar sitt
  eget doc vid pagehide och skrev tillbaka den gamla nivån, så passet körde i själva verket
  nivå 1. Sonden skriver nu i den **levande** `SaveService`-instansen.
- **P0-fix utanför rundans scope** (hittad av `spelkritiker`): molnens träffyta var 90 px,
  6 px under P0:s 96 px-golv. Halon höjd 22 → 26 = 98×184 px.

**Mätt:** `scripts/_elviraprobe.mjs` **10/10 på både nivå 0 och nivå 8** · `npm run check` 0/0 ·
`npm run test:all` **71/71** · 0 fynd i loggen · bygge rent. `spelkritiker`: inga blockerare
utöver fölet ovan, alla 7 grindpunkter håller.
**Commits:** `33392c1` feat(enhorningen-elvira)
**Öppet:** **4 spel kvar som 🔧** — `spindel-zacke-svingar` (spök-båge + nivå-intro) ·
`glittergrottan` (kamera-drift) · `tvatta-djuret` (zoner i leran) · `pruttbad`
(variation/progression). Röstkön tom.

---

## 2026-08-07 (sent) · v1.29.0 · 🕷️ Hjälpen slutade spela spelet åt barnet

**Byggt:** `/polera spindelhjalten` — spelets sista äkta [Deep]-punkt, och den sista
**ersättande** formen av auto-hjälp-mönstret i repot.

- **Förr:** efter 2 missar räknade `_autoAssist` ut ett nästan-perfekt skott och **avfyrade
  det åt barnet**. Ett barn som släppte rakt ner tre gånger fick ändå alla stjärnor.
- **Nu:** `_offerAssist` ritar ut skottets prickbana och tänder en **Skjut!**-knapp. Hjälten
  står kvar tills barnet trycker. Slangbellan stängs aldrig av — det går lika bra att sikta
  själv, och griper barnet hjälten försvinner erbjudandet, så två lägen är aldrig aktiva
  samtidigt. Mall: `enhorningen-elvira:_placeHelperCloud`.
- **No-fail-golvet är orört.** 12 s utan tryck → samma garanterade glid som förr. Inbjudan
  flyttar agensen till barnet **utan** att ta bort garantin att en stjärna alltid samlas.
- **`spelkritiker` hittade hålet i omgångens egen huvudgaranti.** Inbjudan får inte ljuga, och
  därför återanvänder `_solveShot` sin egen `predictTrajectory`-bana som prickbana. Men
  `predictTrajectory` känner golv och väggar — **inte studsmoln**. En bana kunde alltså gå rakt
  genom ett moln och lova en flykt som i verkligheten studsar bort, precis i det ögonblick
  erbjudandet ska bygga tillit. Min egen sond mätte fel sak (bandens *förutsagda* slutpunkt),
  så den var grön. `_solveShot` slutar nu läsa en kandidatbana vid första studskontakten.
  **Mätt efter: minsta marginal bana↔moln 75 px** (var negativ).
- **Studsmolnen syns nu.** `makeCloudBumper` ritade ett moln identiskt med ängens dekor-moln —
  ingen kunde veta vilka som studsade, och jag läste dem själv som bakgrund i skärmdumpen.
  De har nu en krans av blå studsprickar + två uppåtpilar, och stjärnor spawnar inte längre
  ovanpå ett moln.
- **Fjärde gången docen ljög.** Två av tre punkter jag föreslog i omgången (`[Quick]` studsmoln,
  `[Quick]` kombo-pling) var **redan byggda** — jag hade bara kodkollat [Deep]-punkterna när jag
  skrev förslaget. Även `[Medium]` kattung-räddningen visade sig klar (`_rescueKitten:460`).
  Alla strukna med kodbevis i samma commit som bygget, enligt regeln från förra passet.

**Mätt:** `scripts/_offerprobe.mjs` **11/11** · `npm run check` 0 fel/0 varningar ·
`npm run test:all` **71/71** · 0 fynd i `.test-logs/spindelhjalten.json` · bygge rent
(1520 precache-poster). `spelkritiker`: **inga blockerare**, alla 7 grindpunkter håller.
**Commits:** `767b77b` feat(spindelhjalten)
**Öppet:** **`spindelhjalten` 🔧 → ✅ — 5 spel kvar som 🔧** (`enhorningen-elvira` generisk
finish · `spindel-zacke-svingar` spök-båge + nivå-intro · `glittergrottan` kamera-drift ·
`tvatta-djuret` zoner i leran · `pruttbad` variation/progression). Röstkön tom.

---

## 2026-08-07 (kväll) · v1.28.0 · 🔧 Röstkön tömd + 🔧-backloggen visade sig vara bokföring

**Byggt:** Inga kodändringar alls den här omgången — men repots bild av sig självt är nu sann.

- **Röstkön är tom.** `/rost` genererade de 6 sista klippen (`spara-linjen`s fem kritrepliker
  + `Så fint!`) via F5-TTS. `npm run check`: 5 väntande → **0**. Verifierat i körning, inte
  bara statiskt: `npm run test spara-linjen` ger **0 `rost-utan-klipp`** i loggen, alltså
  resolvar manifestet på riktigt vid uppspelning. Klippen är sinsemellan olika filer
  (md5-kontrollerade) och 1,0–1,2 s långa.
- **Avstämning av de 8 kvarvarande 🔧-spelen mot koden — och det var mest bokföringsskuld.**
  Badge-regeln i `docs/games/README.md` är smal: 🔧 = har öppna [Deep]-punkter i sin §4. Läste
  `index.js` för alla åtta i stället för att tro på planen. **5 [Deep]-punkter var redan
  byggda men aldrig strukna:** `vippbradan` (mottagare, byggd 08-04) · `domino` (äkta
  kedjereaktion, byggd 07-01, stod öppen i **fem veckor**) · `enhorningen-elvira` (hjälpen
  bjuder in) · `spindelhjalten` (hjälten firar eget, byggd 08-06) · `tvatta-djuret`
  (djur-specifik finish). **`vippbradan` + `domino` bar 🔧 helt i onödan → ✅.**
- **Det här är CLAUDE.md:s egen fälla, tredje träffen.** "Docens §4 kan vara inaktuell — läs
  koden före planen." Jag valde först `domino` som poleringsmål just för att §4 påstod att
  rasfysiken var fejkad; koden visade `_stepCascade` + `FALL_GUARANTEE` sedan 07-01. Lagt in
  en explicit varning i `docs/games/README.md`: **stryk punkten i §4 i samma commit som du
  bygger den.** `domino` §3 beskrev dessutom den skriptade kedjan som *nuläge* och motsade sin
  egen §1 — nu märkt som ögonblicksbild.
- **`pruttbad` är motexemplet och står kvar som 🔧.** Det har noll [Deep]-punkter, men §5 säger
  att kritikern bedömt `variation` och `mjuk progression` som endast delvis uppfyllda så länge
  rundorna ser identiska ut. Ett ärligt omdöme, inte eftersläpning — badgen ska vara kvar.
- **Indexet rättat:** stod "70 spel" och "70/70 polerade" trots 71 rader; alla 20 Pussel-rader
  är polerade. Nu 71 resp. 20/20.

**Kvar och äkta öppet efter avstämningen** (verifierat i kod, inte antaget):
`spindelhjalten` `_autoAssist:542-559` avfyrar skottet ÅT barnet · `enhorningen-elvira` har
generisk `bigCelebration:890-905` som finish · `spindel-zacke-svingar` saknar spök-båge och
nivå-intro · `glittergrottan` ger röst-ledtråd vid idle (`:883-888`), ingen kamera-drift ·
`tvatta-djuret` kräver båda verktygen globalt men har ingen zon-variation.

**Commits:** `762be16` feat(voice): 6 nya klipp · `03bf1a5` docs(games): stäm av de 8
kvarvarande spelen mot koden
**Kontroll:** `npm run check` 0 fel · 0 varningar · `npm run test spara-linjen` + `spindelhjalten`
gröna · bygge rent (1518 precache-poster).
**Öppet:** `/polera spindelhjalten` är **föreslagen och väntar på ja** — omgången är
[Deep] hjälpen bjuder in i stället för att ersätta (vid miss 2 ritas `_solveShot`s egna
`predictTrajectory`-punkter som prickbana + en ≥96px **Skjut!**-knapp; hjälten väntar på
barnets tryck; miss-3-glidet ligger kvar som no-fail-golv) + [Quick] studsmoln i luften +
[Quick] stigande kombo-ton. Mall: `enhorningen-elvira:757-794`. Kattung-räddningen [Medium]
sparas medvetet till en egen omgång.

---

## 2026-08-07 · v1.27.0 · ✏️ Ritbordet — repots tommaste scen fick kritor

**Byggt:** `spara-linjen` polerad (V3, sista öppna posten i `docs/ATGARDER.md`).
**Repot har nu noll öppna ägarrapporter och noll öppna verktygsfynd.**

- **Verktygsfyndets första spår var fel i sak.** V3 sa "tom vit panel, fyra grå prickar och en
  ✏️-emoji som *hela* verktyget". Kodläsningen visade att motiv-silhuetterna OCH den ritade
  pennan fanns sedan 2026-08-04 — `icon: '✏️'` är bara bibliotekets bricka. Det verkliga felet:
  svårighetsplanen började på `genLine(4)`, så **det första ett barn såg var fyra grå prickar
  på tomt papper**. Precis den fälla CLAUDE.md varnar för: läs koden före planen. Fyndets
  *mätning* (4,3 % innehåll, repots lägsta av 71) var däremot helt korrekt.
- **Två ändringar räckte:** motiv (berg) redan från runda 1, och en **kritlåda med fem ritade
  vaxkritor** under pappret. Vald krita lyfts ur lådan och andas; grannarna vilar nedtonade.
- **Kritvalet är äkta agens, inte dekor:** kritans färg ÄR linjens färg, den kan bytas mitt i
  en teckning (redan dragna segment behåller sin via `d._wcol`), pennan i handen får samma
  färg, och valet sparas i `progress.custom.krita` så det minns sig mellan besök. Kritorna är
  dessutom stämda i samma pentatonik som linjens melodi — lådan är ett litet instrument.
- **`spelkritiker` hittade en punkt jag missat:** kurv-rundorna (ungefär varannan tidig runda)
  hade fortfarande ingen mottagare — bara `PRAISE` + konfetti, alltså ett steg tillbaka direkt
  efter en runda där ett berg vaknar. Fixat med `_celebrateLine`: pennan hoppar till och
  gnistor vandrar längs spåret. Inga blockerare i övrigt.
- **V5-lärdomen återanvänd:** `destroy()` dödar tweens på hela displayträdet i stället för en
  handhållen lista med `if (!x.destroyed)`-vakter. Ny fälla noterad: **`breathe()` tweenar en
  proxy, inte `.scale`** — `killTweensOf(obj.scale)` biter inte på den, tweenen måste sparas
  och dödas explicit.
- **Mätt, inte antaget** (`scripts/_kritprobe.mjs`): kritval ✓ · flerfärgat spår (grön + lila i
  samma berg) ✓ · runda klar → nivå 1 ✓ · kritan följer med ✓ · minns valet efter återbesök ✓ ·
  0 konsolfel vid exit mitt i firandet. Bildkoll: `gles-scen` borta.

**Commits:** `77902dd` feat(spara-linjen) · `54a842d` docs(spara-linjen)
**Kontroll:** `npm run check` 0 fel / 0 varningar · `npm run test:all` **71/71** · bygge rent ·
serverad på :4173 (Tailscale 8445).
**Öppet:** 6 repliker väntar på röstklipp — de fem kritfärgerna + "Så fint!" (`sapbubblor` sa
den vid körning utan klipp; runtime-backstoppen i `check.mjs` fångade den när `test:all` råkade
ta den vägen). Kör `/rost`. Nästa naturliga steg: `docs/IDEER.md` §1 `ansiktssektionen`, eller
de 8 spel som fortfarande står 🔧 med [Deep]-punkter kvar i sin doc §4.

---

## 2026-08-07 · v1.26.0 · 💩 Läckan som bara syntes när alla 71 spelen kördes

**Byggt:** `bajs-och-kiss` V5 — det sista röda i `test:all`. **Sviten är 71/71 igen.**

- **Symptomet var lätt att avfärda:** `pageerror ×112` + `tween-mot-forstort ×3` +
  `tween-lacka ×1`, men BARA i full `test:all`. Ensamt grönt, fyra parallellt grönt, alla 71
  rött — tre fulla körningar i rad. Det är inte flakigt, det är **lastberoende**.
- **Reproducerat utan att köra 71 spel:** ny sond `scripts/_bajsprobe.mjs` stryper CPU:n via
  CDP (`Emulation.setCPUThrottlingRate`) och lämnar spelet vid en rad olika tidpunkter. Det
  återskapar precis det loggen visade före kraschen — `lang-ruta 100 ms` + `fysik/svalt`, alltså
  långa bildrutor där teardown förlorar kapplöpningen. Träffbild före fixen: **~1–2 av 20
  avhopp**. Stacken pekade ut både varianten där en tween *initieras* mot ett rivet mål
  (`_addPropTween` → `get y`) och den där en *löpande* tween skriver (`render` → `set y`).
- **Grundorsak:** `destroy()` dödade tweens objekt för objekt ur en **handhållen lista** över de
  referenser spelet råkade ha kvar. Allt spelet tappat greppet om missades — t.ex. en tidigare
  bajs-vy vars plopp-tween fortfarande gled — och varje `if (!x.destroyed)`-vakt **hoppade över
  städningen i precis det läge då den behövs mest**. Kvar blev en tween som skrev `.y` på ett
  rivet objekt; Pixi v8 nollar `_position` i `destroy()`, så settern kastade varje bildruta.
  **112 konsolfel ur EN läcka.**
- **Fix:** `dodaTrad(this._root)` går igenom hela displayträdet och dödar tweens på varje nod
  (plus `.scale`/`.position`), oavsett om spelet har en referens kvar. De sparade
  proxy-tweenarna och `ctx.later`-timrarna dödas som förut — de sitter på hjälpobjekt, inte i
  trädet. Nettot är dessutom **20 rader kortare** än listan den ersätter.
- **Mätt efter:** 0 fel på 24 strypta avhopp · `npm run test bajs-och-kiss` grönt ·
  **`test:all` 71/71**.

**Commits:** `fb21221` fix(bajs-och-kiss)

**Öppet:**
- Bara **V3 `spara-linjen`** kvar i `docs/ATGARDER.md` (tommaste scenen i repot, 4,3 %
  innehåll). 8 spel kvar med 🔧. Inga öppna ägarrapporter.
- Kvarvarande varningsnivå-ledtrådar i loggen är oförändrade: `saknat-ljudklipp` (MOSS nere),
  `tryck-utan-ljud`, `dod-traffyta`, `sen-aterkoppling`.
- **Metodfynd:** "grönt ensamt, rött i mängd" är ett eget felmönster, inte flakighet. CPU-strypning
  via CDP är ett billigt sätt att framkalla det — och en `if (!x.destroyed)`-vakt före
  `killTweensOf` är alltid fel väg: att döda tweens på ett rivet objekt är ofarligt, att låta bli
  är buggen.

## 2026-08-07 · v1.25.0 · 🥤 Hällningen som aldrig flyttade en droppe

**Byggt:** `saftbaren` V4 — spelets **kärnloop** gjorde bokstavligen ingenting. "Häll ett glas
i ett annat → färgerna blandas" körde hela sekvensen snyggt (glaset åkte till rätt plats, nådde
vinkel 1,02, väntade, åkte hem) men inte en droppe lämnade glaset. Hittades i går genom en
mätning, fixat i dag.

- **Grundorsak: `TILT` och `OFFS` är samma tal sett från två håll och var aldrig mätta mot
  varandra.** Mynningen ligger på `(0, IN_TOP)` i glasets egna koordinater, så vid lutningen θ
  hamnar den `-IN_TOP·sin θ` px åt sidan och `IN_TOP·cos θ` px i höjdled från foten. Vid
  `TILT = 1,05` rad (60°) nådde saften **aldrig över läppen** — och eftersom OFFS var satt för
  den vinkeln kunde ingen av dem ändras ensam.
- **Kalibrerat mot det tal som betyder något** (`scripts/_pourtune.mjs`: fullt källglas,
  riktigt målglas, spelets egen geometri) — partiklar som hamnar **i målet** av ~103:
  `1,05 → 0` · `1,5/205 → 29` · `1,9/205 → 19` · **`2,2/100 → 77`** (spill 7) ·
  `2,4/100 → 81` · `2,6/100 → 86` (spill 13). Att hålla glaset högre mättes också och blev
  **sämre** (längre fall → mer skvätt: 59 i målet, 25–38 spill). Valt **2,2 + 100**: 75 % över,
  minst spill, minst extrem vinkel — glaset tippar förbi vågrätt som en riktig hällning.
- **Tre vägar delade konstanterna och behövde skiljas åt.** Hinken har bred öppning och vill ha
  en fritt fallande stråle → `MOUTH_DX` (178, härledd ur TILT). Bobo *dricker* — hans mun är en
  drain-ruta där saften ska ligga stilla, inte hällas på golvet → egna `SERVE_TILT/SERVE_OFFS`
  (de gamla 1,05/205, som gör exakt det).
- **Fixen skapade en egen bugg, som mätningen fångade direkt.** Ett fullt glas på väg till
  hinken tappade hela innehållet till glas 2 när det gled förbi lågt (52 partiklar blev
  liggande med medel-x 740 ≈ glas 2:s 750). Orsaken var gårdagens djup-ägarregel: den låter det
  **stående** glaset vinna när ett rörligt glas glider lågt förbi, eftersom deras inre överlappar.
  Fix: `SAFE_Y` + `_moveOver()` — ett glas som flyttar sig i sidled lyfts, bärs ovanför
  grannarna och ställs sedan ner. Ser dessutom ut som att glaset lyfts och bärs i stället för
  att glida genom disken, och `_tiltFor` fungerar äntligen för dragna glas.
- **Verifierat via spelets egna vägar** (`scripts/_pourprobe.mjs`): glas→glas **61 partiklar
  över och målet blir GRÖNT, renhet 1,00** (gul i blå — hela poängen med spelet) · glas→hink
  **58 av 58 slukade**, 0 kvar liggande · hela beställningen: Bobo serveras, dricker upp, ny
  beställning kommer.

**Commits:** `5ee202a` fix(saftbaren)

**Öppet:**
- V3 `spara-linjen` (tommaste scenen, 4,3 %). 8 spel kvar med 🔧.
- **V5 `bajs-och-kiss` är nu inringad:** undantaget är `Cannot read properties of null
  (reading 'y')` kastat **inifrån GSAP** — en tween som skriver `.y` på ett mål vars transform
  redan är rivet (`tween-mot-forstort ×3`). Föregås i loggen av `lang-ruta 100 ms` +
  `fysik/svalt steg:5`: under full parallell last blir bildrutorna långa och tweenen hinner
  före teardown. `test:all` står därför kvar på **70/71** (112 konsolfel i den körningen).
- **Metodfynd:** två gånger i rad var det *proben* som var trasig, inte spelet — först en
  hällmätning som siktade fel, sedan en som fyllde glaset med precis den färg Bobo beställt
  (spelet serverade då glaset till honom, helt korrekt). Bägge gångerna räddades av att köra
  om mot HEAD respektive isolerat. En röd sond är ett påstående, inte ett bevis.

## 2026-08-07 · v1.24.0 · 🧲 Magneten som fiskade själv + 🥤 saften som bytte glas

**Byggt:** ägarens fyra rapporterade buggar i `docs/ATGARDER.md` — alla fyra fixade, mätta
före och efter, och båda spelen hade **en gemensam grundorsak per spel**, inte fyra separata fel.

- **`magnet-fiske` #1 + #2 — krafterna var aldrig kalibrerade mot matters enheter.**
  matter räknar `velocity += (force/massa) · steg²` med steg = 16,667 ms, så en acceleration
  `a` ger `a · 277,78` px/steg direkt och `a · 4629,6` px/steg i längden (mätt mot matter-js,
  inte hämtat ur minnet). Spelets konstanter var satta som om force vore hastighet — **~280×
  för starka**.
  - #1: uppmätt **5 av 5 metallsaker fast innan första provet hann tas**, toppfart 79 px/steg,
    saker rakt igenom dammens 40 px väggar. Två fel i ett: fältet var absurt starkt OCH
    påslaget medan magneten hängde **parkerad i luften** 115 px från översta spawn-raden.
    Nu anges krafterna i px/steg (`SPEED_TO_A`) och fältet verkar bara när magneten är
    **doppad** — plask-ögonblicket betyder något. Efter: **0 av 5 efter 8 s utan input**,
    toppfart 2,6, 0 tunnling, `_idleprobe` `idleFramsteg: 0`.
  - #2: fastklistrade kroppar pinnas till sin slot varje bildruta men **krockade** fortfarande
    — slottarna ligger 38 px isär, kropparna har 38 px radie, så solvern sprängde isär klasen
    varje steg och nästa bildruta teleporterades den tillbaka. Uppmätt **53 px svängning,
    47 px hopp mellan bildrutor** med magneten stilla → **0,1 px** efter `isSensor`.
- **`saftbaren` #3 + #4 — två tillstånd som satt på fel objekt.**
  - #3: `_lastMix` satt på SPELET i stället för på glaset, så två glas med var sin blandfärg
    pingpongade värdet var 12:e bildruta och varje växling utlöste både `reveal` och en
    röstreplik. Uppmätt **48 ljud + 48 repliker på 5 s helt utan input** → **1 + 1**.
  - #4: ägarregeln `it.g.y > own.y` ("lägsta glaset vinner") kan aldrig utse en vinnare mellan
    två glas i **samma** höjd — och ett draget glas låg kvar på disken. Jämförelsen blev falsk
    varje gång och ägarskapet föll tillbaka på ordningen i `_glasses`: glas 0 draget förbi
    glas 2 tog **hela innehållet, 56 av 56**. Hållna glas lyfts nu (`HALL_Y`) och ägaren är
    det glas partikeln ligger **djupast** inne i → **0 stulna**. Lyftet rättade en tyst bugg
    till: `_tiltFor` kräver `g.y < o.y - 120`, så ett draget glas lutade sig **aldrig** förut.

**Commits:** `1e3f20a` fix(magnet-fiske) · `dd6b3aa` fix(saftbaren)

**Öppet:**
- **NYTT: `saftbaren` V4 — hällningen flyttar noll vätska.** Spelets kärnloop gör ingenting:
  hela sekvensen körs snyggt (rätt plats, vinkel 1,02, väntan, hem igen) men inte en droppe
  lämnar glaset. `TILT = 1,05 rad` ligger under tröskeln för glasets geometri —
  `scripts/_tiltprobe.mjs` på 103 partiklar: **1,05 → 0 rann ur**, 1,2 → 1, **1,35 → 19**,
  1,5 → 23. Verifierat på HEAD, alltså inget nytt fel, och medvetet **inte** fixat här
  (utanför `/fixa`-uppdraget). En större `TILT` kräver att `OFFS = 205` mäts om samtidigt.
- **NYTT: `bajs-och-kiss` (V5) faller bara i FULL `test:all`** — `pageerror ×3` +
  `tween-lacka ×2` + `tween-mot-forstort ×2`. Ensamt grönt, fyra parallellt grönt, alla 71
  rött i två körningar i rad → last-/timingberoende i exit-cykeln, inte slumpflak. Orört av
  dagens commits (de rör bara `magnet-fiske` + `saftbaren`). **`test:all` står alltså på
  70/71**, inte 71/71 som efter v1.22.0.
- Oförändrat: V3 `spara-linjen` (tommaste scenen), 8 spel kvar med 🔧 (`pruttbad` ·
  `vippbradan` · `domino` · `spindelhjalten` · `enhorningen-elvira` · `tvatta-djuret` ·
  `spindel-zacke-svingar` · `glittergrottan`).
- **Metodfynd, tredje gången på tre sessioner:** inget av dagens fyra fel syntes i konsolen
  eller på skärmdumpen. Alla fyra föll ut ur en **sond som spelade spelet och läste siffror**
  (`_magnetprobe`, `_saftprobe`, `_tiltprobe`, `_idleprobe`). Två av ATGARDERs fyra "första
  spår" pekade dessutom fel — reproduktionskravet i `/fixa` gjorde nytta.

## 2026-08-07 · v1.23.0 · ❄️ Snöfälten som aldrig gick att se

**Byggt:**
- **`snobollen` 🔧 → ✅.** Frågan var om spelet bara saknade sin ✅-rad i indexet (det
  polerades i `13a8cbd`). Svaret: nej — dess **enda sätt att växa var osynligt**.
- Snöfälten renderades med **vågrät skala i tusental** och en skjuvning på hundratals, så de
  smetades ut till en blek hinna över backen i stället för vita fläckar att styra mot. Uppmätt
  `worldTransform` på ett fält: **a = 3660 (fältets världs-x!), c = 591 (fältets y!)** — trots
  `scale.x = 1` i hela föräldrakedjan.
- **Rotorsak: ett namn.** `_addField` sparade världspositionen i `f._cx` / `f._cy`. Det är Pixi
  v8:s **egna** fält i `Container` — den cachade cosinus/sinus för rotationen — och
  `updateLocalTransform()` räknar `lt.a = _cx * scale.x`. Spelet skrev rakt in i renderarens
  transform-cache. Ingen krasch, inget konsolfel, grönt test: bara osynliga spelobjekt.
  Omgången 2026-07-30 fixade *symptomet* (bakade in världspositionen i geometrin) men lämnade
  namnkrocken kvar — därav den återkommande "slät vit platta"-känslan.
- Efter fixen (`_wx`/`_wy`): `worldTransform` a=1, c=0; ett fälts bounds **126×101 px** (var
  579 048 px brett), `_fieldLayer` 4 084 px (var 20 395 341), `_root` 5 669 = banans längd.
- **Klassfix:** `check.mjs` felar nu på varje `<objekt>._cx/_cy/_sx/_sy/_position/_scale/_pivot/
  _origin/_skew/_rotation/_updateFlags/_worldTransform/_maskEffect/_filterEffect =` i ett spel.
  Verifierat åt båda håll: regeln faller på den gamla koden, är tyst på den nya. Hela repot är
  rent — snöbollen var enda träffen.

**Commits:** `8d6d579` fix(snobollen): snofalten var osynliga

**Öppet:**
- Kvar med 🔧: `pruttbad` · `vippbradan` · `domino` · `spindelhjalten` · `enhorningen-elvira` ·
  `tvatta-djuret` · `spindel-zacke-svingar` · `glittergrottan` (8 st).
- Oförändrat: ägarens fyra buggar i `magnet-fiske`/`saftbaren`, V3 `spara-linjen`.
- **Metodfynd:** två av dagens tre buggar (NaN-kropparna och snöfälten) var osynliga för både
  konsolen och skärmdumpen men uppenbara i en **bounds-/transform-mätning**. Överväg att lägga
  en `utanfor-rimligt`-kontroll i `gamelog` (ett objekt vars bounds är tiotusentals px brett).

## 2026-08-07 · v1.22.0 · 🧱 Klossarna som försvann i tomma intet

**Byggt:**
- **`bygg-tornet` gick inte att spela klart** — diagnostikloggen visade `nan-kropp ×5` och
  `nan-transform ×6` per körning, helt utan konsolfel, och harnessen sa grönt hela tiden.
- **Grundorsaken låg i det delade fysikbiblioteket, inte i spelet.** En matter-kropp som
  *skapas* med `{ isStatic: true }` i sina options får flaggan satt som en vanlig egenskap —
  `Body.setStatic()` körs aldrig, så `_original` (massa · tröghet · densitet) fångas **aldrig**.
  Ett senare `Body.setStatic(kropp, false)` hittar då inget att återställa: kroppen blir
  dynamisk med massa OCH tröghet kvar på `Infinity`, och första simsteget räknar
  `Infinity/Infinity` = NaN. Kroppen teleporteras till NaN, dess länkade Pixi-vy följer med.
- I spelet betydde det att **varje kloss försvann i släppet**: `_settleActive` jämförde NaN mot
  tröskeln, alla jämförelser blev falska, klossen räknades som en miss — tornet kunde aldrig
  växa. Ett barn hade sett en kloss lyftas upp av kranen och sedan bara upphöra.
- `PhysicsWorld.rectangle/circle/polygon` skapar nu alltid kroppen dynamisk och sätter
  `isStatic` **efteråt**. Sex spel skapar statiska kroppar och väcker dem senare:
  `bygg-tornet` · `flipperspel` · `knuffa-tornet` · `kulbana` · `snobollen` · `studsmatta`.
- Ny sond: `scripts/_nanprobe.mjs` spelar ett spel med riktiga tryck och läser spelets **egna
  fält** var 100:e ms — första bildrutan där något blir NaN skrivs ut med hela tillståndet
  runtomkring. Den pekade ut exakt bildruta och fält på under en minut.

**Commits:** `fe45a2f` fix(fysik): kroppar som skapas statiska gick aldrig att vacka

**Öppet:**
- Samma som v1.21.0 (hög 3 med 9 🔧-spel, ägarens fyra buggar i `magnet-fiske`/`saftbaren`,
  V3 `spara-linjen`), minus NaN-fyndet. **Repot har nu 0 fel-nivåfynd i hela `test:all`.**
- Kvarvarande varningsnivå-ledtrådar i loggen: `tryck-utan-ljud` (9 spel), `dod-traffyta` (4),
  `sen-aterkoppling` (6), `saknat-ljudklipp` (5, MOSS-pipelinen ligger nere).

## 2026-08-07 · v1.21.0 · 🔊 Röstklippen som aldrig spelades + 💥 Knuffa Tornet får sitt pussel

**Byggt:**
- **V1 — introt talades av robotrösten fast klippet fanns.** `VoiceService` hämtar manifestet
  asynkront i konstruktorn medan spelen säger sin `voiceIntro` vid mount: ett spel som startade
  under de första millisekunderna föll därför ALLTID till Web Speech. `say()` skjuter nu upp
  repliken tills manifestet landat (tak 1500 ms så en hängande fetch aldrig tystar appen), och
  `cancel()` ogiltigförklarar en väntande replik så inget börjar tala efter att spelet lämnats.
  `gamelog` dömde likadant i blindo — loggraden skrivs i tid, fyndet väntar in manifestet.
  **Mätt: 16 spel / 17 träffar `rost-utan-klipp` → 0 av 71.**
- **V2 — repliker som byggs vid körning var osynliga för kontrollen.** Template-repliker
  (en `voice.say` med backtick och `${...}` i) kan omöjligt slås upp statiskt; de räknas nu
  bara (27 st) och
  verifieras där sanningen finns: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json`
  och varnar för den EXAKTA text körningen sa. Backtick utan `${}` läses som vanlig literal
  (var helt osynlig förut). Första körningen: **4 äkta luckor, noll falska** — "Lätt vikt!" +
  "Tung vikt!" (`vippbradan`, där `voice-phrases.json` hade Liten/Stor medan etiketterna heter
  Lätt/Tung), "Nästan!" (`bygg-tornet`) och "en" (`ballonglyft`). Alla fyra har klipp nu.
- **💥 Knuffa Tornet, hög 2 (variation & agens) — 🔧 → ✅.** Hjälpen **bjuder in** i stället för
  att spela klart: efter två missar ställs kulan i perfekt läge med kranen siktad på närmaste
  kvarvarande kloss och blinkar i en gul ring; spelet svingar själv först efter 7 s. Fem
  tornformer roterar per nivå (torn · trappa · port · pyramid · dubbel). Tre specialklossar —
  sten, gummi, glas — gör valet av tyngd och rep till ett pussel, och står bara sten kvar
  pekar spelet på tyngdknappen i stället för att ta över. Mätaren är en prick per kloss
  (kronan sist). Finishen är spelets egen: dammoln längs avsatsen → flagga hissas till en
  durtreklang → Bobo jublar → konfetti.

**Fem balansfynd som inget grönt test hade visat** (`scripts/_tornprobe.mjs` spelar varje nivå):
1. **Repets längd var hela balansen.** 330 px lade kulans underkant 24 px OVANFÖR understa
   klossraden — ett fullt sving nöp bara toppen. 348 halverade antalet svingar per nivå.
2. **Friktion 0,7/1,4 limmade ihop stapeln** så tornet gled 80 px i sidled per sving i stället
   för att rasa.
3. **Springan mellan avsatsen och skärmkanten var exakt en kloss bred** — en kloss kilade fast
   där och räknades aldrig som nere. Målet mäts nu i x ("av avsatsen"), inte bara i fallhöjd.
4. **En hjälp som siktar på den bortersta klossen flyttar kranen och lämnar den där** (nivå 1
   gick 4 → 8 svingar). Sikta på den närmaste.
5. **`_drawChain` måste ritas sist i bildrutan** — `_freezeBall` teleporterar kulan efter att
   repet ritats, vilket frös fast på varje skärmdump som ett rep hängande bredvid kulan.

**Commits:** `ec21e80` fix(rost): vanta in klippmanifestet fore say() · `a7edc8c` docs: V1+V2
till Avklarat · `52bd308` feat(knuffa-tornet): variation och agens

**Öppet:**
- **Poleringskampanjen fortsätter.** Hög 2 är klar (6/6). Indexet visar fortfarande **9 spel
  med 🔧**: `pruttbad` · `vippbradan` · `domino` · `spindelhjalten` · `enhorningen-elvira` ·
  `tvatta-djuret` · `spindel-zacke-svingar` · `snobollen` · `glittergrottan`. Notera att
  **snobollen redan polerats** (13a8cbd) — antingen missades indexraden eller så saknas en
  grindpunkt; kolla dess doc §5 innan den köas om.
- `docs/ATGARDER.md`: V3 (`spara-linjen`, tommaste scenen i repot) är kvar, plus ägarens fyra
  rapporterade buggar i `magnet-fiske` och `saftbaren`.
- Knuffa Tornet flaggar ibland `tween-per-ruta` (~125) i bildrutan där vinsten infaller. Det är
  firandets engångsskur, inte en tween per bildruta.

## 2026-08-06 · v1.18.0 · 🚜 Grävmaskinen: fem laster, och två mätare som ljög (polerings-hög 2, 5/6)

**Byggt:**
- **Fem laster i stället för en** — sand · grus · snö · småsten · godisströssel turas om per
  nivå. Varje last har egen palett (**även högen man gräver ur byter färg** — snönivån har en
  snöhög, godisnivån en regnbågshög), egen kornform, egna skatter, egna ljud och egna
  repliker. Sandens fyra repliker är oförändrade strängar eftersom de redan hade klipp.
- **Egen rasvinkel per last.** Branta laster (snö, småsten) kräver **två cellers fall** för
  att glida i sidled och bygger spetsiga koner; lösa laster lägger sig platt. Regeln är
  deterministisk med flit — en *sannolikhet* hade bara fördröjt utplaningen, eftersom ett
  vilande korn får ett nytt tärningskast varje simsteg.
- **Auto-hjälpen mjukad + tap-fusket borta.** Triggern "4 tippningar" sköt in magi mitt i
  aktivt spel och är borttagen; kvar är 14 s **helt** utan handling **och** lasten minst 55 %
  färdig → högst 14 korn, målet sänks aldrig. Tap vid högen gräver nu på riktigt.
- **Agens i gesten:** fyllnaden skalar med svepets längd *och* djupet (djupt tag ≈ 3× ett
  ytskrap); lugn hand vid släpp ger tät stråle, ryck ger bred spridning — aldrig en
  tillsägelse när det blir slarvigt.
- **Ny finish + mottagare:** fylld dumper kör iväg med lasten, en tom **backar in från höger**
  (från vänster hade den kört rakt genom grävmaskinen), Bobo vinkar från hytten. Bommen är nu
  bom + knäled + sticka med hydraulcylinder som sjunker med lastens vikt; Zacke andas och
  lutar sig mot grävtaget. Grävmaskinen 🔧 → ✅.

**Fyra fynd som gröna tester aldrig hade visat:**
1. **Fyllnadslinjen ljög.** Målet var 55 korn ≈ 2,4 rader medan linjen satt 6 rader upp —
   `total >= target` slog alltid först och linjen var ren dekoration. Linjen härleds nu ur
   målet.
2. **"Full last" räknade korn i LUFTEN.** `_countFill` räknade fallande korn, så en enda hög
   tippning kunde klara nivån direkt — harnessen klarade nivå 0 på **3,4 sekunder** och
   rapporterade ändå grönt. Nu räknas bara korn som vilar.
3. **Mätaren var osynlig på snönivån** — den ärvde lastens färg, och vitt på gräddvitt syns
   inte. Hittad i skärmdumpen, inte i något test.
4. **Mätaren stod på 45 % när spelet sa "full last"** — två indikatorer som säger olika saker
   är värre än en som ljuger. Den visar nu den av de två vägarna till full last som kommit
   längst.

**Metod:** `scripts/_lastprobe.mjs` (sond som *spelar*: gräver, kör över flaket, släpper) gav
balansen sand 4 lass · grus 4 · snö 3 · småsten 3 · godis 6, och en bild per last.
`scripts/_exitprobe.mjs` testar det harnessens standardcykel aldrig hinner till: att lämna
spelet **mitt i** den 3 s långa leveransen (rent i alla tre faser).

**Commits:** 6f2195d feat(gravmaskinen) · a0d538c chore(rost): 48 röstklipp genererade

**Öppet:** hög 2 har **1 kvar: knuffa-tornet**. Därefter hög 3 (finish, ~3 spel). Rapporterade
buggar i `docs/ATGARDER.md` väntar fortfarande (magnet-fiske, saftbaren).

---

## 2026-08-06 · v1.17.0 · 🍦 Glasstornet: kärlet byter per nivå (polerings-hög 2, 4/6)

**Byggt:**
- **Kärl-cykel per nivå** — våffelstrut → bägare → skål. Skillnaden är **fysik**, inte bara
  utseende: skålen har jättebred mynning men låg kant (nästan omöjligt att missa, men hela
  tornet står i blåsten), bägaren smalare mynning men höga raka väggar som håller de två
  nedersta kulorna stilla. `_buildVessel()` river och bygger om de statiska kropparna per
  torn; `mouthR`/`columnMax` följer med så siktguiden alltid talar sanning. Rösten säger
  vilket kärl som står framme. Verifierat hela vägen: strut(3) → bägare(4) → skål(4).
- **Topping-överraskningar** — sällsynt **regnbågskula** (~1/9, egen Graphics per band) som
  glittrar medan den bärs och smäller av i färgexplosion + treklang; annars ibland
  **strössel** eller **såsdrypning** som ligger KVAR på kulan. Tak: en per kula.
  **Strösselregn** över den färdiga glassen — finishen är glass-egen.
- **Hjälpen delad i två steg (docens hög-2-punkt).** Tre bortblåsta i rad ger bara
  **klister**; **magneten går bara till den sista kulan** och är kapad. Efter två bortblåsta
  **blinkar honungsburken** och rösten berättar vad den gör — hjälp som *lär ut kontrollen*
  i stället för att bygga tornet. Glasstornet 🔧 → ✅ (alla 8 grindpunkter).

**Tre fynd som gröna tester aldrig hade visat** (hittade med en Playwright-sond som spelar
med spelets **egen** `_predictLanding` och mäter mot en HEAD-baseline):
1. **`frictionStatic` (matter-default 0,5) är det som håller en kula kvar på en slänt** —
   låg `friction` ensamt räcker inte. Skålens grunda slänt parkerade kulorna så att två
   hamnade **i bredd**, vilket bryter hela "ETT torn"-idén.
2. **En kula som kilar fast på en annans axel** (dy≈63 i stället för 84) låser tornet snett,
   och sedan finns **ingen giltig plats kvar** för nästa kula. Bygget blev obyggbart utan
   att något såg trasigt ut — testet var grönt hela tiden. Sådana landningar glider nu av.
3. **`frictionAir` EFTER nedslaget avgör om kulan stannar**, inte friktionen mot underlaget:
   det är farten kulan har kvar (plus vinden) som rullar av den. `SCOOP_STICKY` 0,02 →
   **0,055** gjorde honungen till spelets verkliga lösning. Med honung tar ett torn 5–6
   släpp (strut 5 · bägare 5 · skål 6) mot HEAD-baselinens 6 för *tre* kulor — alltså
   snällare än förut, trots att den automatiska magneten dragits tillbaka.

**Metod värd att återanvända:** när en balansändring ska bedömas, **mät mot HEAD**. Första
versionen av den mjukare hjälpen kändes rimlig i koden men tog 14 släpp utan att bli klar —
det syntes bara genom att köra samma sond mot `git show HEAD:...`.

**Även i denna session (utanför poleringskörningen):**
- **Agentregeln ändrad** — det tidigare totalförbudet mot att starta subagenter oombett är
  ersatt av **upp till 3 subagenter**; fler kräver att ägaren frågas. Workflows och
  deep-research kräver fortfarande en förfrågan. Regeln står nu i `CLAUDE.md` (Arbetsregler).
  Obs: originalformuleringen ligger inte i någon fil i repot eller i `~/.claude/settings.json`
  — den injiceras av harnessen vid start, så den kan dyka upp igen; `CLAUDE.md` går före.
- **`docs/ATGARDER.md` — ny stående åtgärdslista** för buggar ägaren rapporterar när hen
  spelar (återupptar formatet från den avbetade `bugfixes-progress.md`). Fyra öppna rader:
  `magnet-fiske` (allt sitter redan fast i magneten vid start · fastklistrade saker skakar)
  och `saftbaren` (ljudet hakar upp sig efter färgbyte · vätskan följer med glas som dras
  förbi). Varje rad har ett **första spår** från kodläsning, märkt som ledtråd och inte som
  diagnos — `/fixa` ska reproducera i harnessen först. Två observationer värda att spara:
  magnetfiskets spawn-ruta ligger *långt* utanför fastna-radien, så startbuggen är troligen
  inte överlapp; och saftbarens `_carryAll()` har redan en ägarregel vars egen kommentar
  säger att den ska hindra exakt det som händer — det är en **trasig** fix, inte en saknad.

**Commits:** a3628ec feat(glasstornet) · 9031c0c docs v1.17.0 · 4c91f11 sessionslogg ·
f71dbba docs agentregel · cb622fc docs åtgärdslista
**Öppet:** hög 2 har 2 kvar (`gravmaskinen`, `knuffa-tornet`), sedan hög 3 (finish, ~3 spel).
Glasstornets kvarvarande §4: [Deep] smak-staplings-mål, [Medium] kund-kö, [Quick] ambient.
De fyra raderna i `docs/ATGARDER.md` är ett naturligt `/fixa`-pass när som helst.
6 repliker väntar på klipp — kör `/rost` när narratorn är uppe.

---

## 2026-08-06 · v1.16.0 · 🔍 Diagnostiklogg + snöbollens banvariation (polerings-hög 2, 3/6)

**Byggt:**
- **Diagnostiklogg (`src/lib/gamelog.js`) — ny, DEV-only.** Spelar in input, utdata, fysik,
  rendering, motorernas interna läge (matter · Pixi · GSAP · three) och fel, kopplad på de
  **delade chokepoints** så att inget av de 71 spelen behövde ändras: GameHost (livscykel,
  progress, timers), en global pointer-capture på `window` (fångstfas — Pixis egen lyssnare
  ligger på canvasen och kör annars FÖRE oss, vilket förskjuter varje svarstid ett helt
  tryck), `PhysicsWorld`, `DragController`, `drawIcon`, `AimLauncher`, `ThreeLayer`
  (`renderer.info`) och en patch på `gsap.to/from/fromTo/timeline/delayedCall`.
  Ovanpå råloggen ligger **16 härledda fynd**: `dod-traffyta`, `tryck-utan-ljud`,
  `sen-aterkoppling`, `saknad-ikon`, `rost-utan-klipp`, `saknat-ljudklipp`, `tween-lacka`
  (animation som lever efter destroy), `forstort-i-scen`, `nan-transform`, `utanfor-bild`,
  `tom-scen`, `snal-snappyta`, `kropp-rymde`, `fysik-svalt`, `tween-per-ruta`, `scen-svall`.
  Harnessen hämtar loggen efter varje körning → `.test-logs/<id>.json`, och `npm run test`
  listar fynden per spel. **Noll kostnad i produktion:** `import.meta.env.DEV` foldas till
  `false` och minifieraren slänger kroppen — grep efter diagnostiksträngar i `dist/assets`
  ger noll träffar. Inga nätanrop, inget till localStorage (P0 "ingen spårning").
- **Första skörden (71/71 gröna, alltså osynligt för konsolfel):** 15 spel med
  `rost-utan-klipp`, `sapbubblor` 9× `saknat-ljudklipp`, 10 spel med `tryck-utan-ljud`,
  3 med `dod-traffyta`, `fallskarmen` 175 nya tweens/500 ms.
- **`vandkort` — tyst tryck fixat.** `_flip()` bortade tidigt på `_busy`/`_flipped`/`_done`
  **före** ripple och flip-ljudet: under jämförelsepausen och på redan vända/färdiga kort
  gav ett tryck ingenting alls (P0-brott). Nu svarar kortet med `wiggle` + mjuk ton, och
  ett glatt pling på ett färdigt par.
- **`snobollen` — banvariation + rotorsaken till den vita backen.** Varje bana lottar väder
  (sol/snöyra/kvällsljus/gryning) och layoutprofil (jämn/myllrande/öppen/snörik), aldrig
  samma två i rad. **Och:** backens djupgradient har aldrig synts — inte för att den
  saknades, utan för att **snöfälten var upp till 476 000 px breda** (naken `Graphics`
  ritad kring origo + stor `.position`, samma fälla som minnesnotisen
  `pixi-graphics-position-bar-bug`) och lade en vit matta över hela skärmen; dessutom
  ritades de fem djupbanden i EN `Graphics`, vilket gav hela backen det första bandets färg.
  Båda fixade. Snöfältets `sparkle` bytt mot en snö-virvel som sugs in i bollen.

**Commits:** dfa5189 diagnostiklogg · 6587680 vandkort-fix · 13a8cbd snobollen banvariation ·
ecb6f97 docs v1.16.0

**Öppet:**
- Polerings-hög 2 fortsätter: **4/6 glasstornet**, sedan gravmaskinen och knuffa-tornet
  (alla "mjuka upp auto-hjälpen + nivåvariation" — kontrollera först mot koden, snöbollens
  auto-hjälp visade sig redan vara gjord och docens §1/§3 var inaktuell).
- Loggens fynd är **inte** åtgärdade: `tryck-utan-ljud` i 10 spel och `dod-traffyta` i
  `harma-melodin`, `vad-forsvann`, `vilket-djur-later` är obekräftade ledtrådar som behöver
  läsas mot koden (vandkort-fyndet visade sig vara äkta).
- `sapbubblor` spelar `audio.sample()` utan klipp 9 gånger → helt tyst; kör `/rost`.
- `spelkritiker`-steget hoppades över i den här omgången (subagent ej körd) — kör det gärna
  på `snobollen` innan hög 2 fortsätter.

## 2026-08-06 · v1.14.0 · 🎰 Flipperspelet fick en bana (polerings-hög 2, 2/6)

**Byggt:**
- **Återupptagen körning.** 17 okommitterade filer visade sig vara en **`FONT`/`Text`-
  importrensning** i 15 spel (uppföljning på lärdomen att `FONT` är ett *objekt*, så en
  kvarglömd import lockar till `fontFamily: FONT` som kraschar `Text` först vid rendering)
  plus två riktiga layoutfixar: **knuffa-tornet** (kranens mast slutade i luften på y≈492)
  och **saftbaren** (ytterflaskorna låg bakom hem-/ljudknappen, flaskhalsarna kapades av
  skärmkanten). Allt verifierat och committat.
- **`flipperspel` — 🔧 → ✅.** Bordet var ett platt fält av identiska stjärndynor; nu är det
  en bana: **snurra** ovanför dränet, **två studsfenor** i det döda bandet, **tunnel** (två
  hål i sidoväggarna), **tre ritade dynetyper** (stjärna/klocka/blomma med egen silhuett,
  studs och klangfärg) och ett **eget showläge** som finish — kulan lyfts ur banan upp till
  Bobo som fångar den och kastar konfettin. `bigCelebration` är borta.
- **Buggar hittade på vägen:** `_toggleTilt` satte `.text` på `_tiltIcon`, som blev en
  `Graphics` 2026-08-04 — en no-op, så Lugnt-läget visade en blixt. Och `sfx('flip')` /
  `sfx('pling')` fanns aldrig i ljudmanifestet; nu används de riktiga klippen `thwip`,
  `boing` och `whoosh` som redan låg oanvända.

**Lärdomar (fysik med banelement):**
- Tunnelmynningar på **samma höjd** gör tunneln till en loop — den utspottade kulan flyger
  tvärs över rakt in i den andra. 17 tunnelresor och **noll** paddelkickar på 40 s.
- En **svag** studsfena är värre än ingen: 9,5 i kick lyfte kulan ~50 px och den föll rakt
  ner på samma fena igen. Fenan måste nå upp i dyn-fältet (17).
- Placeringsregeln allt vilar på: inget par av ytor får bilda en **nedåt smalnande kil**.
  Varje passage ska vara bredare än 100 px hela vägen eller helt tätad (< 56 px = kulans
  bredd). Mellanlägen klämmer fast kulan.
- **Sond-gotcha:** `import('/src/games/<id>/index.js')` i webbläsaren ger en EGEN
  modulinstans i Vite dev. Den levande hämtas via
  `(await import('/src/games/registry.js')).getGame(id)`.

**Commits:** `80fa204` fix(knuffa-tornet) · `23ee542` fix(saftbaren) · `c68113c` chore:
FONT/Text-rensning i 15 spel · `bafa0a0` feat(flipperspel) · `1c4be18` docs(flipperspel) ·
`97913e5` chore: v1.14.0

**Öppet:** Polerings-hög 2 fortsätter — kvar: **snobollen, glasstornet, gravmaskinen,
knuffa-tornet** (alla har "mjuka upp auto-hjälpen" + nivåvariation i sin doc §4). Sedan
hög 3 (finish, ~3 spel). `.claude/settings.json` är ändrad (plugin-konfig) men medvetet
inte committad. 29 röstrepliker väntar på `/rost`.

---

## 2026-08-06 · v1.13.0 · 💧 Vätskemotor + Saftbaren (spel 71)

**Byggt:**
- **`src/lib/vatska.js`** — ny vätskemotor. Partikelvätska (double density relaxation) i
  px/steg med fast 1/60-steg, spatial hash, typade arrayer, roterbara låd-kollidrar och
  metaboll-rendering (mjuka klickar → sudd → tröskelfilter). Uppmätt i riktig Chrome:
  0,25 ms/bildruta vid 200 partiklar · 0,54 vid 400 · 1,12 vid 800 · 5,3 vid 3000, full
  60 fps hela vägen. Ingen befintlig motor kunde detta (matter/p2 är stelkroppar, three har
  bara ytshaders, liquidfun är övergivet).
- **`saftbaren`** (spel 71, Fysik-fliken) — fyra glas, kran på skena, färgspak, hink och Bobo
  som beställer. Häll mellan glasen → färgerna späds i vätskan: gul + blå blir grön. Bobo
  dricker upp den beställda färgen (partikel för partikel, stigande ton) och rapar en färgad
  bubbla. Droppstorleks-toggel för lek.
- Motorn utökades under bygget med **färg per partikel** (`world.pal` + `FluidView.palette`),
  **ingrediens-kanaler** (`setChannels` — riktig utspädning, mängden bevaras) och
  **roterade kärlväggar** (`addBox(..., angle)`).

**Tre buggar som kostade tid (nu dokumenterade i skill fysik-spel):**
1. `Filter.from` fyller inte i någon vertex-shader — skicka `defaultFilterVert`.
2. En skenande partikel som blir `NaN` spränger filtrets renderingstextur → 0,5 fps.
   Fix: hastighetstak, tak på viskositetens kvadratterm, `Number.isFinite`-vakt, låst
   `boundsArea`.
3. Ett kärl som flyttas måste **bära med sig sin vätska** (annars står saften kvar i luften),
   och varje partikel behöver EN ägare — annars stjäl ett glas som flyger förbi innehållet ur
   ett som står stilla.

**Öppet:**
- Röstklipp: 11 nya repliker väntar → kör `/rost` när narratorn är uppe (Web Speech täcker upp).
- `docs/IDEER.md` har två oplanerade idéer: ansiktssektionen (foton som spelfigur) och
  nätskott från bilfönstret.
- Oavslutad `/polera figurer`-körning ligger kvar i `.claude/state/korning.json`.

## 2026-08-06 · v1.12.0 · ⚙️ Mottagar-högen — 8 spel fick någon som bryr sig

**Byggt:** start på kvalitetsspåret "20 spel från 🔧 till ✅". De 20 spelen visade sig falla i
tre arbetshögar i stället för att vara 20 separata jobb; **hög 1 (mottagare) är nu klar** och
lyfte 6 spel hela vägen till ✅ kvalitet.

- **Nytt delat `src/lib/figurer.js`.** `makeMascot()` ger bara ett HUVUD, så fem spel hade
  hunnit rita var sin Bobo-kropp med nästan samma geometri. Biblioteket har nu `makeBobo`
  (proportioner tagna ur vippbradans kropp, den renaste av dem), `makeElvira` och
  `makeSquirrel`. De fyra äldre spelen migrerades medvetet INTE — deras kroppar är handtrimmade
  mot sin scen och en omskrivning riskerar regression utan vinst för spelaren.
- **Åtta spel fick en mottagare eller en egen reaktion:** Bobo som puttar gungan och mål som
  *hoppar* när Lova närmar sig (`gungan`) · Bobo som vinkar in föraren och fångar, och som
  följer mattan när den flyttar sig per nivå (`fallskarmen`) · parkgrind + Lova som hejar
  (`valpens-bajs`) · picknick där varje fångad morot flyger till korgen som fylls synligt
  (`studsmatta`) · arbetar-Bobo med bygghjälm (`knuffa-tornet`) · kryp som kryper mot en
  spricka i stället för att rycka slumpmässigt, plus hjälten som hoppar i nätet
  (`spindelnatet`) · Elvira som RIDER enhörningen och ringar som brister i sin egen färg
  (`enhorningen-flyger`) · "Uff!" vid väggstuds och en hjälte som hänger upp-och-ner i sin
  egen tråd vid vinst (`spindelhjalten`).
- **Skärmdumpen fångade tre placeringsfel** som ett grönt test aldrig ser: figuren hamnade
  bakom "starkare knuff"-knappen (`gungan`), helt bakom "Tyngd"-knappen (`knuffa-tornet`) och
  ovanpå kraftmätaren (`studsmatta`). Efter de två första blev det rutin att slå upp
  UI-knapparnas koordinater INNAN figuren placeras.
- **Två doc-punkter var redan gjorda** och ströks i stället för att byggas om: `fallskarmen`s
  "[Quick] föraren får en kropp" (`makeKid` ritade redan hela figuren) och `flipperspel`s
  "[Deep] maskot bor i maskinen". Verkligheten vinner över dokumentet.
- **P0-fynd på köpet:** `gungan`s mål (🐦🍎🎈🦋🌟🍏) var emoji-Text trots att de är spelobjekt
  → `drawIcon`; 🍏 saknades i ikonbiblioteket.

**Commits:** `b2d8b64` figurer.js · `0e9f3ab` gungan · `f6dc893` fallskarmen · `e5be0a8`
valpens-bajs · `8644e4b` studsmatta · `7257aa2` knuffa-tornet · `0d3b52e` spindelnatet ·
`9963161` enhorningen-flyger · `d5b273d` spindelhjalten
**Kontroll:** `npm run check` 0 fel · 0 varningar · `npm run test:all --jobs 2` **70/70 gröna**
· bygge rent.
**Öppet:** kvalitetsspåret fortsätter med **hög 2 — variation & agens** (bowling specialkäglor,
flipperspel banelement, snobollen gömda fynd, glasstornet smak-mål, knuffa-tornet
specialklossar, tvatta-djuret smutszoner, ~2,5 tim) och **hög 3 — egen finish**
(tvatta-djuret, enhorningen-elvira, ~1 tim). `gravmaskinen` och `pruttbad` har inga
[Deep]-punkter kvar alls och behöver troligen bara omgraderas. 15 repliker väntar på `/rost`.

---

## 2026-08-06 · v1.11.0 · 🔤 Lära-fliken polerad — **poleringsrundan 70/70 KLAR**

**Byggt:** hela 🔤 Lära-kön (9 spel) körd i ett svep med checkpoint mellan varje. Därmed är
**hela poleringsrundan avslutad**: alla 70 spel är genomgångna (🎉 15 · ⚙️ 27 · 🧩 19 · 🔤 9).

- **P0 ASSETS i sex av nio spel.** `vilket-djur-later` (12 djur), `kla-efter-vadret` (13 plagg
  + vädertecknet), `ballonglyft` (Elvira, presenten, 8 överraskningar), `siffertaget`
  (vagnslasten), `blixt-och-dunder` (lamporna + mätaren) och `djurorkester` (6 djur) ritade
  emoji som spelobjekt. Greppet från Pussel-rundan höll: **behåll emoji-strängen som NYCKEL**,
  byt bara renderingen.
- **`artikoner.js` växte med 25 nycklar.** Fem bondgårdsdjur (får · häst · anka · höna · tupp),
  kyckling, en helt ny `wear`-mall med 17 plagg i 12 former, och två vädertecken (regnmoln,
  snöflinga). **🐮 kon ritades om** från grunden — den gamla var en vit cirkel med runda öron
  och läste som isbjörn; nu horn, breda öron, fläck och mule. Den syns i fem spel.
- **Nytt verktyg `scripts/_ikoner.mjs`** — ritar valda nycklar i ett rutnät och skärmdumpar.
  Det var det som avslöjade att kon, hästmanen, hönskammen, ankan, regnhatten, regnjackan,
  sandalen och halsduken var svaga. Sandalen fick tre försök innan den slutade läsa som en
  bänk; lösningen blev att rita den **ovanifrån** medan övriga skor är sidovy.
- **Fyra äkta spelbuggar** som gröna test aldrig sett, alla hittade i skärmdumpen:
  - `kla-efter-vadret`: ett plagg spawnade alltid på x=640 — ovanpå Elvira OCH inuti
    fot-zonens Ø260 träffyta. En liten knuff kunde räknas som en placering barnet aldrig gjort.
  - `ballonglyft`: en ballong spawnade bakom presenten och gick inte att hitta — rundan kunde
    då bara lösas av auto-hjälpen. Dessutom klipptes ballongsnörena av nederkanten.
  - `rakna-applen`: två frukter hängde i ren himmel, 192 px från närmaste lövboll (radie 156).
  - `blixt-och-dunder`: Bobos fötter hamnade på y=731 — utanför 720-skärmen.
- **Bobo var ett svävande huvud** i `blixt-och-dunder` (`makeMascot()` ger bara ett huvud —
  samma fynd som i fem Pussel-spel). Ny `makeBoboBody()`.
- **Två mottagare tillagda** (gate-punkt 4): en ritad **ekorre** i `rakna-applen` vars kinder
  rodnar gradvis mot antalet i korgen, och en ritad **Elvira med kropp** i `ballonglyft`.
- **Röstbuggarna borta — repo-kontrollen är 0 fel och 0 varningar för första gången.**
  `peka-pa-kroppen` byggde alla sina frågor med `.replace()` på mallsträngar och `fargregn`
  med strängkonkatenering; klipp-manifestet slår upp på exakt text, så spelens KÄRNREPLIKER
  föll tillbaka på Web Speech. **Alla 100 fanns redan i `voice-phrases.json`** — det var
  källkoden som gjorde dem onåbara. Nu fulla literaler i uppslagstabeller. 11 → 0 varningar.
- **`fargregn` fick sin [Medium]-punkt:** pölarna bär nu färgen som landade i dem, och två
  OLIKA grundfärger i samma pöl blandas synligt (gul+blå→grön, röd+blå→lila, röd+gul→orange)
  med gnistor, stigande ton och talad förklaring. Sällsynt eftersom målfärgen dominerar regnet
  — ett wow-ögonblick, inte en mekanik barnet måste hantera.

**Commits:** `35bf5ab` vilket-djur-later · `208e6fe` kla-efter-vadret · `ef49053` ballonglyft ·
`e6d75a8` siffertaget · `fee4f68` blixt-och-dunder · `17cd80e` djurorkester · `a39c26a`
rakna-applen · `a6b0d75` peka-pa-kroppen · `81b1b7f` fargregn
**Kontroll:** `npm run check` **0 fel · 0 varningar** · `npm run test:all --jobs 2` **70/70
gröna** · bygge rent.
**Öppet:** 15 repliker väntar på `/rost` (12 sedan tidigare + 3 nya färgblandnings-repliker).
Fyra `sfx`-prompter väntar fortfarande på att MOSS är uppe. `ballonglyft`s
`_attachLoose(ctx, b, opts)` tar emot `{ auto: true }` men läser aldrig `opts` — auto-hjälpens
fäste går inte att skilja från barnets eget tryck; noterat i spelets doc §4, inte ändrat.

---

## 2026-08-06 · v1.10.0 · 🧩 Pussel-fliken polerad — 19 spel, ett delat ikonbibliotek

**Byggt:** hela 🧩 Pussel-kön körd i ett svep, ett spel i taget med checkpoint mellan varje.
Poleringsrundan är därmed **61/70** — bara 🔤 Lära (9) återstår.

- **P0 ASSETS var skulden, och den var värre än mätt.** 18 av 19 spel hade emoji som
  spelobjekt, oftast som *emoji-Text ovanpå en opak vit skiva* — dubbelt brott mot regeln.
  Rensat i samtliga: 60 kortsymboler (`vandkort`), 44 figurer (`skuggmatchning`), 32 sopor
  (`sortera-skrap`), 23 plagg (`kla-pa-nallen`), 16 element (`trollblandning`), 16 motiv
  (`vad-forsvann`), 33 figurer (`stor-liten`), hela sakkatalogen i `magnet-fiske`, m.fl.
  Greppet som funkade genomgående: **behåll emoji-strängen som NYCKEL** — spelen slår upp
  namn, djurläten och kategori på den — och byt bara renderingen.
- **Nytt delat bibliotek `src/lib/artikoner.js`.** Efter tre spel med överlappande figurer
  bröts ritmotorn ut ur `vandkort`: `drawIcon(key, size)` med parametriska mallar (djur ·
  frukt · fordon · form · havsdjur · verktyg) drivna av en tabell, ~110 nycklar. Fem spel
  använder den. En genomsökning verifierar att varje nyckel spelen slår upp finns i tabellen
  — saknade nycklar faller igenom till en grå cirkel som ser ut som ett medvetet designval
  i skärmdumpen. Fjäril, regnbåge och fotboll hann göra just det.
- **Fem svävande huvuden fick kroppar:** trollkarlen (`trollblandning`), Elvira
  (`kugghjulen`), de fyra djuren (`folj-sparet`), Zacke/Alissa (`golvet-ar-lava`) och Bobo
  (`kulbana`). `makeMascot()` ger BARA ett huvud. I `trollblandning` ritades kroppen redan
  men syntes aldrig: faceR 80 ger en 160 px bred ansiktscirkel som täckte hela bålen.
- **Tre spel fick en mottagare** (gate-punkt 4): draken vid skatten (`golvet-ar-lava`), Bobo
  vid hinken (`kulbana`) och katten vid hinken (`magnet-fiske`).
- **`golvet-ar-lava` fick sin [Deep]-punkt:** en prickad förhandsvisning av hoppbanan som
  ritas om vid varje stenflytt. `_buildSeq()` och `_arcHeightFor()` delas av förhandsvisningen
  OCH det verkliga hoppet, så de kan aldrig säga olika saker. Vit bana = figuren klarar det
  själv, blek blå + molnmarkör = hjälpmolnet får bära.
- **Sju layoutfel som bara syntes i skärmdumpen:** Gå!-knappen mitt i lavafloden; magnetspöets
  pivot rakt under ljudknappen (spöet drogs tvärs igenom den); L-kugghjulet klippt av
  skärmkanten; hinkens botten bakom Delar-hyllan; Bobos armar ritade före bålen så de doldes
  helt; 3D-mottagaren halvt utanför vänsterkanten; och ett sista kliv som gick **bakåt** på
  breda banor i `golvet-ar-lava` (`treasureNodeX` kunde hamna vänster om `rightLandingX`).
- **Fem röstbuggar** där repliker aldrig kunde få klipp: `voiceIntro` som pekade på en konstant
  i stället för att stå skriven på plats (`sortera-skrap`, `stor-liten`) och konkatenerade
  strängar (`folj-sparet`, `enkelt-pussel`, `mata-monstret`). check.mjs matchar **bara
  literaler**. Repo-varningarna gick från 16 → 11.

**Sidospår på begäran:** `p2-es` tillagd som tredje fysikmotor — verifierad funktionellt
(låda faller och landar i ett röktest) och bundlar till 66 KB, dynamiskt importerad så bygget
är oförändrat. Skill **fysik-spel** har fått en motorvalstabell först i dokumentet: egen
ticker-integrator · matter · p2 · three, plus regeln en motor per spel. Spelindexet städat —
`kvalitet` och `polerad` är nu **två** kolumner i stället för en överlastad emoji, och 42
spel-docs synkade mot indexet. Ny idébank `docs/IDEER.md` med förstapersons-nätskottsidén.

**Commits:** 19 spel-commits · `a9fd079` idébank · `dbd506a` index · `936c8c3` p2-es
**Kontroll:** `npm run check` 0 fel · 11 varningar · `npm run test:all --jobs 2` **70/70
gröna** · `test:fx` grön · bygge rent.
**Obs för nästa körning:** med `--jobs 4` faller `glittergrottan` på slut på WebGL-kontexter —
det är harnessen, inte spelet. 3D-spelet behöver ~13 s innan det renderar, så en tom skärmdump
betyder inte att något är fel.
**Öppet:** 🔤 Lära-fliken (9 spel) är sista kön i poleringsrundan. 12 repliker väntar på
`/rost`. Fyra nya `sfx`-prompter (`duns` m.fl.) väntar på att MOSS är uppe.

---

## 2026-08-05 · v1.9.0 · 🔊 Röstkön tömd — 343 nya klipp

**Byggt:** `/rost` körd skarpt. Hela kön av svenska repliker har nu riktiga F5-TTS-klipp.

- **Var pipelinen faktiskt finns.** Utgångsfrågan var om Holodeck-projektet har en F5-pipeline
  vi kan låna på psai3. Det har det **inte**: Holodecks TTS är **Chatterbox** (devnen-servern,
  Turbo-engine) på **PC 2 "andreas-hem"** `192.168.1.125:8004`, och V3 är **engelska only** sedan
  2026-06-26. `HoloDeck_V2/TTS_RESEARCH_2026-06-26.md` utvärderade F5-TTS och valde bort det.
  psai3 förekommer bara som filutdelning i de dokumenten. **Den svenska F5-pipelinen låg redan
  där `npm run voice` pekade**: storygen-narratorns venv här på psai1 (torch 2.6.0+cu124, RTX
  4090, `EkhoCollective/f5-tts-swedish` 3,2 GB i HF-cachen — inget nätanrop behövs).
- **72 repliker som spelen säger** men som saknades i `voice-phrases.json` lades till först, så
  de kom med i samma körning. Resultat: **351 gjorda, 1051 överhoppade, 0 misslyckade.**
- **Skräp rensat.** `_addphrases.mjs` lägger till precis vad `check` rapporterar — även bitar av
  mall-strängar (`" dropparna!"`, `"Hurra! "`) och rena **platshållare** (`"Hitta {d}!"` från
  `peka-pa-kroppen`). Åtta platshållare hann få klipp där rösten läser upp `{d}` högt innan de
  upptäcktes. Klipp, manifest-poster och repliker borttagna; fällan dokumenterad i
  `docs/POLERINGSRUNDA.md` intill verktyget.
- **Kvalitetskontroll:** alla 351 nya klipp mätta med `ffprobe` — 0,98–8,47 s, median 2,60 s,
  inga avhuggna eller skenande, 0 manifest-poster utan fil. Täckning nu **1394 repliker /
  1395 klipp, 0 utan klipp**.

**Buggfix i verktygskedjan:** `npm run voice` och `npm run sfx` var **trasiga på Windows**. npm
kör sina scripts genom cmd.exe, och cmd klarar inte en kommandorad som *börjar* med en citerad
sökväg och sedan har fler citerade argument — den svarade "Felaktig syntax för filnamn,
katalognamn eller volymetikett" och körde aldrig något. Varken snedstreck eller bakstreck
hjälpte (skill-dokumentationens råd "kör från PowerShell" räckte alltså inte). Ersatta med
`scripts/run-tts.mjs`, som spawnar python med en riktig **argv-array** — ingen shell-citering
alls. Fungerar nu från både PowerShell och git-bash, kör `python -u` så framstegsraderna
strömmar live i stället för att buffras till slutet, och ger ett begripligt fel om venven saknas.

**Commits:** `b6f1d8a` feat(voice) · `11f4de9` chore v1.9.0
**Kontroll:** `npm run check` 0 fel · 16 varningar · bygge rent (precache 1450 poster, 25 MB,
1395 röstklipp i `dist/`).

**Öppet:**
- De 16 varningarna är **läcka #4-skuld i opolerade spel**: `fargregn`, `enkelt-pussel`,
  `folj-sparet`, `mata-monstret` och `peka-pa-kroppen` bygger repliker ur mall-strängar, och
  `sortera-skrap` + `stor-liten` saknar `voiceIntro`. Fixas i respektive spels poleringsomgång
  (Kö 2 🧩 Pussel och Kö 3 🔤 Lära, 28 spel kvar) — inte genom att lägga fragment i röstlistan.
- MOSS-SoundEffect (:8003) är fortfarande nere → 21 sfx-klipp, `npm run sfx` väntar. Modellen
  ligger cachad lokalt, så det är bara tjänsten som behöver startas.
- Referensrösten är fortfarande `narrator_default.wav` med ett **engelskt** transkript. Det har
  gett 1395 dugliga svenska klipp, men en svensk referens är den enda kvarvarande kvalitetsspaken
  — och den kräver att **alla** klipp görs om, inte bara nya.

## 2026-08-05 · v1.8.0 · 🎉 **Roligt-fliken KLAR** (14/14)

**Byggt:** poleringsrundans Kö 1 färdig — de nio återstående spelen i 🎉 Roligt, ett i taget med
skärmdumpsgranskning, `_idleprobe` och egen commit. Rundans genomgående fynd:

- **P0 `ASSETS` läckte i sex av nio spel, och alltid på samma sätt:** ett spelobjekt var en emoji
  i en ruta, cirkel eller bricka. `lagerelden` (🪵-ved), `enhorning-glitterbajs` (🍓🧁🍪 i en vit
  panel), `loopdjuren` (fyra djur i cirklar + fem block i fyrkanter), `regnbagsmalaren` (🦄 som
  pensel + 🌸🌷🌼), `fyrverkeri` (✨/⭐ som målstjärnor) och `tryck-och-forvandla` (**alla 25
  förvandlingssteg**). Allt är nu ritat med egen silhuett. Inga `Text`-noder kvar i något av de
  nio spelen.
- **Elfte läckan — "loggen ljuger".** `enhorning-glitterbajs` doc §5 påstod sedan 2026-07-01 att
  maten ger olika glitter. Men `makePelletView()` **tog inget argument** och ignorerade
  `_glitterKind`, så alla tre maträtterna gav identiska gula prickar. Ett grönt test och en
  nöjd logg-rad räcker inte: *verifiera att den påstådda kopplingen faktiskt går hela vägen
  fram till pixlarna.*
- **Tolfte läckan — framsteg vid INGÅNG.** `tryck-och-forvandla` anropade `progress.setLevel()`
  i `init`, före första trycket, så `_idleprobe` gav `idleFramsteg: 1` utan en enda beröring.
  Regel: progress skrivs när barnet klarat något, aldrig när spelet startar.
- **Läcka #6 (`arc()` efter `fill()`) igen, två gånger.** I `enhorning-glitterbajs` drog den ett
  långt streck från containerns origo tvärs över hela enhörningen (syns tydligt i skärmdumpen);
  i `tarta-i-ansiktet` fanns samma fel latent i clownens mun men doldes av näscirkeln som ritas
  efter. Leta efter `.arc(` som första vägkommando efter `.clear()` eller `.fill()`.
- **Läcka #4 (konkatenerade repliker) i tre spel** — `tryck-och-forvandla`
  (`` `${st.a} ${st.n}!` `` för alla tio resultat), `kittla-figuren` och `lagerelden`. Alla
  omskrivna som hela literaler så `/rost` kan generera klipp.
- **Element bakom skalets hörnknappar, två fall:** `enhorning-glitterbajs` mätarstjärna på y 116
  och `fyrverkeri` vindflagga på (96, 96) — båda delvis under knapparna som når y ~112.
- **Scener som svävade:** `lagerelden` hade hela lägerplatsen 64 px ovanför marklinjen
  (`createScene` ger 96 px mark), och Elvira i `enhorning-glitterbajs` stod 80 px över marken.

**Utöver P0** fick varje spel ett riktigt lyft: lägerplats med tält och eldflugor och fyra sorters
mat att rosta; äkta glitterskillnad per mat; stämda instrumentblock med ritade djur; överraskningar
som flyger ur varje färdig regnbågsbåge; måne, stadssiluett och en publik som ropar "Oooh!" i
fyrverkeriet; levande, driftande bubblor med Bobo som samlar fångsten i en burk; kittel-ledtråd i
fritt läge och skrattårar; och en riktig cirkusscen med ridåer, publik och fyra tårtsorter.

**Commits:** `5909607` lagerelden · `ce7d4cc` enhorning-glitterbajs · `4d5fb57` loopdjuren ·
`2d7bc14` regnbagsmalaren · `ecdd289` fyrverkeri · `1494b6c` tryck-och-forvandla ·
`b0df504` klambubblor · `ea0d70e` kittla-figuren · `67830b9` tarta-i-ansiktet

**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `_idleprobe` på alla
nio: `idleFramsteg: 0`.

**Öppet:**
- Poleringsrundan fortsätter med **🧩 Pussel (19 spel)** och **🔤 Lära (9 spel)** = 28 kvar.
  Tabellerna i `docs/POLERINGSRUNDA.md` är avbockade för hela Kö 1.
- **199 repliker väntar på röstklipp** (upp från 136) — kör `/rost` när F5-TTS-narratorn är uppe.
  76 av `npm run check`-varningarna är den kön, samtliga i spel som ännu inte polerats.

## 2026-08-05 · v1.7.0 (pågående) · 🎉 Roligt-fliken, spel 4 av 14

**Byggt:** `sapbubblor` polerad — fjärde spelet i poleringsrundans Kö 1. Rundans stora fynd den
här gången är inte ett assets-brott utan ett **designfel som gröna tester aldrig ser: spelet
spelade sig självt**. Kritiker-agenten lät spelet stå orört i 60 sekunder och mätte en hel nivå
klar efter 10 s, utan ett enda tryck. Orsaken var två samverkande saker som är osynliga både i
koden och i skärmdumpen: var tredje bubbla föddes i ringens lodräta korridor, och "suget" mot
ringen hade en radie som var bredare än den ser ut. No-fail hade glidit över i att barnets input
är dekoration. Nytt verktyg `scripts/_idleprobe.mjs` mäter det: nollställer progress, rör inget
i N sekunder, spelar sedan riktat. Efter fixen: **20 s utan input = 0 framsteg**, 30 s riktat
spel = full ring, och no-fail-ventilen kliver in först runt 40–50 s.

Själva omgången: blåset är **riktat** (tryck i himlen → närmaste fläkt vrider sig dit och föder
en vindpuff som färdas längs siktlinjen och knuffar bubblor i båda axlarna, kraft delad med
massan), **Bobo håller ringen** och gapar/sväljer/hoppar, en **poppad bubbla släpper en
barnbubbla** så leksaken och målet hänger ihop, och alla emoji-spelobjekt är ritade — inklusive
åtta överraskningsfigurer i `overraskningar.js`. Dessutom sjätte läckan igen (glans-bågar utan
`moveTo` drog streck tvärs över varje bubbla), sjunde läckan (bubblor osynliga mot ljus himmel),
avklippta fläktstativ, träffyta 80–96 px på barnbubblor, och en arm som lossnade när Bobo hoppade.

**Commits:** 3d88ede feat(sapbubblor): riktat blås, Bobo håller ringen, 8 ritade överraskningar

**Öppet:** Kö 1 fortsätter med `pruttbad` (skuld 10) → `lagerelden` → … 10 spel kvar i Roligt,
sedan Pussel (19) och Lära (9) = **38 av 70 kvar**. Versionsbump, `npm run build`/`serve` och
`npm run backup` sker när hela Roligt-fliken är klar (se `docs/POLERINGSRUNDA.md`). Två nya
röstrepliker väntar på klipp — kör `/rost` när F5-TTS-narratorn är uppe.

---

## 2026-08-04 · v1.7.0

**Byggt:** **Hela ⚙️ Fysik-fliken poleras spel för spel** — alla 27 spel gicks igenom med
`/polera`-kedjan (läs doc §3/§4 → skärmdump som spelare → bygg → `check` → `test` → commit
→ doc §5). En commit per spel.

- **P0 ASSETS var den genomgående skulden.** 20 av 27 spel hade emoji som HELA spelobjekt,
  ofta i en ruta eller cirkel — precis det regeln förbjuder. Nu ritas bl.a. 16 flyt/sjunk-
  föremål (`plask-i-vattnet`), 6 frukter (`fanga-frukten`), 5 byten (`spindelnatet`), tre
  bollar med eget ansikte (`rulla-bollen-hem`), bowlingkäglor (🎳-emojin visade en boll OCH
  käglor i varje "kägla"), grävmaskin + dumper + Zacke i hytten (`gravmaskinen`), kanin,
  groda, kattungar, ekorre, djuransikten per art, penna, mål, vikter, ikoner och mätardetaljer.
- **Fyra spel fick en mottagare** (gate-punkt 4): Bobo på ängen (`poppa-ballonger`), målvakten
  i målet (`rulla-bollen-hem`), Bobo vid korgen (`studsbollar`) och fickor med ansikte som
  gapar hungrigt (`studsa-ner`). Fem spel fick Bobo en **kropp** — han var ett svävande huvud.
- **Tre spel fick ett nytt syfte:** kattungen som ska räddas ner för tornet (`bygg-tornet`),
  den hungriga ekorren som önskar sig en fruktsort (`fanga-frukten`), och — störst —
  **`spara-linjen` där prickarna nu bildar en BILD**: åtta motiv (berg, hus, moln, fisk,
  hjärta, katt, stjärna, blomma) som fylls med färg, får ögon och ett leende när linjen sluts.
- **Progression som består:** gömda kompisar i ballongerna, vänbok över klappade arter,
  skyline av byggda torn, myntkruka, hål-rad, upptäckts-logg — allt sparat i `custom`.
- **Sex layout-/synlighetsbuggar** hittade i skärmdumpsgranskningen som gröna tester aldrig
  ser: mätaren under ljudknappen (`studsa-ner`), mätaren bakom avsatsen + oläsbara etiketter
  (`knuffa-tornet`), knapp klippt av nederkanten (`rulla-bollen-hem`, `fallskarmen`), tom
  vikt-ikon tills första trycket (`fallskarmen`), enhörningen vänd bakåt (`enhorningen-flyger`),
  upp-och-nedvänd kanin (`studsmatta`), och `floatText` som skrev ut ordet "gem" över scenen
  (`enhorningen-elvira`).
- **Kodbuggar:** ~15 `gsap.delayedCall` → `ctx.later()`; `_calls` som växte obegränsat under
  en lång session (`klappa-mullvaden`); oändliga tweens mot Pixi-objekt som kan förstöras
  (proxy-mönstret); tre konkatenerade röstrepliker som `check.mjs` aldrig kunde hitta och
  `/rost` därför aldrig kunde klippa.
- **Scener:** 12 spel fick en riktig plats i stället för tapet — staket, träd, vimplar,
  fotbollsplan med linjer, byggarbetsplats, glasskiosk, lekplats, snödrivor, ängsdekor.

**Commits:** `76d591e` poppa-ballonger · `291a5fc` klappa-mullvaden · `a3552b4` plask-i-vattnet ·
`1e08672` bygg-tornet · `18741d5` rulla-bollen-hem · `eec5eba` spara-linjen · `b62fb42` studsbollar ·
`60ee318` studsa-ner · `c860c6f` fanga-frukten · `a50464e` vippbradan · `310cf20` domino ·
`a7d44c2` studsmatta · `aac5fe5` knuffa-tornet · `b13e5de` spindelhjalten · `1409056` enhorningen-elvira ·
`72ba7b2` valpens-bajs · `bca8995` tvatta-djuret · `3356281` gungan · `86b557c` spindelnatet ·
`3af8567` fallskarmen · `4c145f6` enhorningen-flyger · `56cdfc7` spindel-zacke-svingar ·
`8e179cb` bowling · `3337304` flipperspel · `34b8cbe` snobollen · `b239f4f` glasstornet ·
`9e8dc5a` gravmaskinen
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `npm run test:fx` grön.
**Öppet:** 136 repliker väntar på klipp (`/rost`) — 83 nya från den här omgången. Nio spel
markerade ✅ i indexet (hel omgång: mottagare + assets + variation); de övriga 18 fick
assets-/scen-/buggrundor och står kvar som 🔧 med kvarvarande [Deep]-punkter i sin doc §4
(bl.a. riktiga SFX-klipp, mjukare auto-hjälp i några spel, och samlingar som består).

**➡️ NÄSTA SESSION:** samma omgång ska köras för de tre återstående flikarna —
🎉 Roligt (14) → 🧩 Pussel (19) → 🔤 Lära (9) = **42 spel kvar av 70**.
Metod, de fem läckorna, verktyg och en **ordnad kö sorterad efter uppmätt asset-skuld**
ligger i **`docs/POLERINGSRUNDA.md`**. En checkpoint i `.claude/state/korning.json` gör att
SessionStart-hooken lyfter det automatiskt — kör **`/aterta`** för att fortsätta.
Kö 2 (Pussel) är märkt ✅ i indexet, men den bedömningen gjordes 2026-07-02, **innan P0-regeln
`ASSETS` fanns** (2026-07-25) — skulden är uppmätt och verklig, så kör dem ändå.

---

## 2026-07-25 · v1.4.0

**Byggt:** Ägarens speltest-runda: en ny P0-regel, **två systemiska buggar i delad kod**, och
sju spel åtgärdade av fem parallella agenter.

- **Ny P0-regel `ASSETS`** — spelobjekt ritas fristående med egen silhuett och eget liv;
  aldrig en emoji i en ruta eller bricka. Kort och paneler är för text och UI. Inskriven i
  `CLAUDE.md`, `docs/DESIGN.md §8.1`, kvalitetsgrinden (punkt 8), skill `spelkontrakt` och
  båda bygg-/kritiker-agenterna. Heuristik: 22 av 70 spel har kvarvarande skuld (ej åtgärdad).
- **Systemisk bugg 1 — objekt växte vid upprepade tryck.** `pop()` läste sitt eget pågående
  läge som bas → 1.18, 1.39, 1.64 … utan tak. Samma felklass i `wiggle` och `shake`.
  `pop()` används i **64 av 70 spel, 291 ställen**. Första fixen räckte inte (4.11× kvar på
  12 tryck) — `gsap.killTweensOf()` dödar timelinens barn-tweens men inte timelinen, vars
  `onComplete` nollställde flaggan mitt i nästa puls. Nytt regressionstest `npm run test:fx`.
- **Systemisk bugg 2 — fördröjda anrop läckte mellan spelomgångar.** Modulerna är singletons,
  så en `gsap.delayedCall` överlever `destroy`; vid nästa start är `_alive` åter `true` och
  vakten släpper igenom den gamla callbacken. **69 av 70 spel** använder `delayedCall`.
  Nytt `ctx.later(sekunder, fn)` i `GameHost` knyter fördröjda anrop till spelomgången.
- **Sju spel:** `zackes-biltvatt` (tvåfas-loop svamp→skum→slang, skrubbmotstånd, verlet-slang
  från hydrant, fristående objekt) · `domino` (snäppet returnerade **alltid `null`** pga `NaN`
  i avståndet — ingen bricka har någonsin kunnat fastna; + regnbågsgradient styr placeringen) ·
  `siffertaget` (tåget backade iväg; sättet ompositionerat) · `flipperspel` (`Body.setAngle`
  roterade kring masscentrum → 30–90 px paddeldrift; kulan nådde dessutom aldrig ner till
  paddlarna; +42 % bordsbredd) · `snobollen` (banan var **matematiskt omöjlig** att klara —
  uppmätt x=656 mot mål 1085; hindren välter nu) · `glasstornet` (körsbäret och pendeln hade
  ingen begriplig roll — nu mål respektive vind; layout rättad) · `glittergrottan`
  (teknikdemo → ordningsspel med sex regler och facit-rad).
- **`check.mjs`** hittade inte repliker som ligger i konstant-banker → 199 saknade repliker
  upptäckta mot tidigare 50 (189 efter att speltitlar undantagits).

**Commits:** `80a4a6d` lib-fixar · `4e03f80` ASSETS-regel · `839abd0` check · `54431b9`
biltvätt · `c92f751` domino · `6c31558` siffertåget · `e58ec67` flipper · `09bcead` snöbollen ·
`8effc24` glasstornet · `623ed87` glittergrottan · `a6ac26a` röst
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `npm run test:fx`
grön · bygge rent.
**Öppet:** 189 repliker väntar på klipp (`/rost`). ASSETS-skulden i 22 spel. Retroanpassning
av `ctx.later()` i de 69 spel som fortfarande använder `delayedCall` direkt. Snöbollens banor
är nu snabba (~2 s för en van spelare), och `glittergrottan` hör mekaniskt hemma i
Pussel-fliken snarare än Roligt.

---

## 2026-07-25 · v1.3.0

**Byggt:** **Zackes Biltvätt** (`zackes-biltvatt`, 70:e spelet) — pipelinens första skarpa
körning — plus en **lättad P0-regel om motgång**.

- **Regeländring (ägarbeslut):** motgång var tidigare i praktiken förbjuden
  (`FEEDBACK = … ENDAST positivt`). Nu finns en egen P0-rad **`MOTGÅNG`**: hinder och bakslag
  är tillåtna och önskvärda, ska gå att anpassa sig runt, som mest sakta ner, och måste ha ett
  **tak** + lagom takt. Fortfarande förbjudet: misslyckande som avslutar/nollställer,
  "game over", sjunkande poäng, bestraffande timers. Uppdaterad på 11 ställen (CLAUDE.md,
  skills, agenter, README, ARCHITECTURE, PIPELINE, docs/games/README). `spelkritiker` flaggar
  numera även **för lite** motstånd.
- **Spelet:** två verktyg med olika styrka (svamp skrubbar tjockt, slang sköljer brett och
  skrämmer bort fåglar innan de bajsar) → ett äkta val. Tak: max 3 bajsfläckar samtidigt,
  därefter missar fåglarna. 6 fordon, 4 fågeltyper + sällsynt regnbågsfågel. Finish: glans-svep,
  tvåtons-tuta, ägaren jublar och åker med ut genom glansbågen; pentatonisk ton per ren fläck.
- **Pipelinen fungerade.** `spelkritiker` hittade två äkta blockerare som jag missat: slangens
  syfte var oupptäckbart (tipset kom först *efter* en lyckad träff), och `progress.complete()`
  klippte den spelspecifika slutrepliken (`voice.say` anropar alltid `cancel()`). Skärmdumps-
  granskningen fångade tre visuella buggar som ett grönt test aldrig sett: streck över Zackes
  ansikte (`.arc()` i delad Graphics), svävande ägare, fläckar utanför karossen.
- **Bugg i leveranssteget hittad och fixad:** `scripts/start.ps1` + `stop.ps1` var UTF-8 **utan
  BOM** med å/ä/ö → Windows PowerShell 5.1 (som `npm run serve` startar) läste dem som ANSI och
  gav parse-fel. BOM tillagd; `npm run serve` fungerar igen. `scripts/backup.ps1` skrevs
  ASCII-rent av samma skäl.

**Commits:** `b903562` feat(zackes-biltvatt) · `d610505` feat(pipeline)
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · bygge rent · serverad
på :4173 (Tailscale 8445).
**Öppet:** 8 nya repliker väntar på röstklipp (`/rost` när narratorn är uppe). Fågelljuden lånar
fel djur (`djur_hona/uggla/anka/tupp`) tills MOSS kan generera riktiga mås/gås-läten.

---

## 2026-07-25 · v1.2.0

**Byggt:** Projektet fick en riktig pipeline. Kunskapen som tidigare låg som prosa i en
261-raders `CLAUDE.md` (och i minnesfiler) är nu **körbara verktyg och laddas-vid-behov-skills**.

- **`CLAUDE.md` 261 → 59 rader** — bara P0-reglerna, kommandoytan och en routingtabell.
  Allt djup flyttat till fem nya skills: `spelkontrakt`, `spel-pipeline`, `fysik-spel`,
  `ljud-och-rost`, `skal-och-data` (plus de befintliga `threejs-*`).
- **8 svenska slash-kommandon** — `/spel` `/polera` `/felsok` `/fixa` `/testa` `/rost`
  `/avsluta` `/aterta`.
- **3 subagenter** — `spelbyggare` (bygger en slice), `spelkritiker` (spelar som 3-åring,
  kvalitetsgrind), `felsokare` (buggjakt med adversariell verifiering).
- **`npm run check`** (`scripts/check.mjs`) — validerar kontrakt, registret åt båda hållen,
  P0-brott, docs och röst-täckning. Strikt läge per spel. Hittade 52 verkliga varningar:
  50 repliker som aldrig kan få ett röstklipp + 2 spel utan `voiceIntro`.
- **`npm run test` / `test:all`** (`scripts/test-games.mjs`) — parallell headless-körning över
  ett/flera/alla spel, med automatiska musdrag för dragspel. **Baslinje: 69/69 gröna.**
- **Krasch-återhämtning** — `.claude/state/korning.json` (checkpoint före varje steg) +
  `scripts/session-start.mjs` som lyfter avbrutna körningar vid sessionsstart + `/aterta`
  som verifierar mot disken innan den fortsätter.
- **`npm run backup`** — robocopy-spegel till `E:\backup\pwagames` (inkl. `.git`, exkl.
  `node_modules`/`dist`). Hoppar tyst över om disken saknas.
- **Docs:** `docs/PIPELINE.md` (människoläsbar pipeline), den här loggen,
  `docs/games/_MALL.md` (spec-mall), omskriven `README.md`, `ARCHITECTURE.md` trimmad till
  levande beslut med forskningen arkiverad i `docs/arkiv/`.

**Öppet:**
- 50 röstrepliker saknas i `scripts/voice-phrases.json` → kör `/rost` när narratorn är uppe.
- 2 spel saknar `voiceIntro` (`npm run check` pekar ut dem).
- Pipelinen är byggd men ännu inte körd skarpt — första riktiga testet är nästa `/spel`.
