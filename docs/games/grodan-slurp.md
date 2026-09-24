# Grodan Slurp (`grodan-slurp`)

> ⚙️ fysik · tap · 3–5 år · ✅
> Status: ✅ marknadsklar · byggd och publicerad i nattpasset 2026-09-23/24 (v1.254.0) ·
> superhoppet + grodkörens hem-knapp 2026-09-24 (v1.255.0) · bajsloopen (L3 av biomplanen, §4d)
> 2026-09-24 (v1.257.0) · kamera + stor värld (L4, v1.258.0) · biomerna is/fors/skog (L5, v1.259.0) ·
> sikt-pil för superhoppet + vändknapp (v1.260.0)

## 0. Spec (fylls i av `/spel` innan kod skrivs)

Ägarens idé, ordagrant: *"ett grodspel som kan hoppa, fånga flugor med sin tunga, sitter i en
damm, grodan ska ha ragdoll kropp, roligt fysik spel där grodan ska fånga flugor, rörliga
kroppsdelar där grodan inte bara är några enkla former utan en detaljerad groda med samma
kroppsfysik, leder, rörelser, mm som en groda har. tungan kan fastna överallt och är det tyngre
saker med mer massa så åker grodan mot det den fastnat i fortare, flugor och andra insekter åker
in i munnen och äts, grodan tumlar och flänger, träffas grodan av nåt eller åker in i nåt större
hårdare studsar den av och ragdollar. spelet ska vara ett roligt, dynamiskt, kreativt och
fantasifullt spel där man inte är låst vid samma animationer och händelser om och om igen,
oförutsägbart och utmanande på ett sätt man behöver vara kreativ på och försöka flera gånger där
man lär sig att inte ge upp."*

| | |
|---|---|
| **id** | `grodan-slurp` |
| **titleSv** | Grodan Slurp |
| **icon** | 🐸 |
| **kategori** | `fysik` → flik Fysik |
| **input** | `tap` — tryck = tungan skjuts mot punkten · tryck PÅ grodan = hopp · HÅLL på grodan = superhopp (valfritt: ett kort tryck är alltid ett vanligt hopp), och fingret som DRAR under hållet siktar (en pil visar banan) · tryck på grodkören med en korv i munnen = kast · håll 2,5 s på grodkören = grodan hem · VÄNDKNAPPEN nere till höger vänder grodan utan tunga |
| **ålder** | [3, 5] |
| **kärnloop** | Grodan sitter på ett näckrosblad i dammen. Tryck någonstans → tungan skjuts mot punkten och fastnar på det FÖRSTA den träffar. Insekt → rullas in i munnen, GULP. Gren/sten/stock (fast eller tung) → grodan slungas dit och dinglar i tungan. Lätt sak (löv, kotte) → saken dras till grodan. Tryck igen = släpp + ny tunga. |
| **mål** | ~~8 insekter~~ → sedan L3 (v1.257.0): tre matade grodungar. En full mage (8 insekter, sedan 4 — 5 före L5) blir en bajskorv; tungan hämtar den, grodan bär den och ett tryck på kören kastar den → `progress.complete()` när alla tre fått varsin |
| **agens** | VAR tungan fastnar avgör allt: massan bestämmer vem som flyger mot vem. Högt uppe-insekter nås bara genom att kombinera: hopp → tunga i luften, svinga från grenen, dra en flytande stock närmare och använda den som plattform. Grodan som flyger genom luften med öppen mun äter insekter i vägen av sig själv. |
| **variation** | Slumpad damm varje omgång (näckrosblad, vass, stockar, grenar, stenar) · tid på dagen (morgondimma / eftermiddag / skymning med lysande eldflugor) · insektsblandning: fluga (lugn), mygga, trollslända (pilar), fjäril (fladdrig), humla (TUNG — drar grodan runt i tungan). Sällsynt wow: guldfluga · en anka simmar förbi → fastnar tungan i den blir det vattenskidor över dammen. |
| **motgång** | EN i taget, var ~10–15 s, först efter de 2 första insekterna: kotte som faller från trädet · sköldpadda som simmar förbi (hårt skal) · fisk som hoppar · vindpust. Träffas grodan → studsar av, ragdollar, tumlar, plaskar i, flyter upp och sätter sig igen. Uppätna insekter försvinner ALDRIG — motgången saktar bara ner. |
| **ragdoll** | Aktiv ragdoll i matter.js, 12 kroppsdelar (kortet sa 11 — räknefel; byggd: 2 + 2×2 arm + 2×3 ben): huvud (bulliga ögon, bred mun), kropp, 2× överarm+underarm, 2× lår+underben+lång fot (simhud, tåkuddar). Leder med vinkelgränser + "muskler" som strävar mot en pose: hopkrupen sittpose i vila, fullt utsträckta ben i hoppet, bröstsim-spark i vattnet. Vid smäll → musklerna slaknar (ren ragdoll), sedan samlar grodan sig igen. Halsen blåses upp när den kvackar, magen växer för varje insekt. |
| **autohjälp** | Sent och synligt: en lugn fluga inom räckhåll under de FYRA FÖRSTA (sedan måste grodan ta sig dit — se §3); efter flera bommar sjunker en tjock fluga ner mot grodan. Tomma tungskott = roligt "slurp-snärt" tillbaka, aldrig fel-ljud. |
| **mottagare** | Tre grodungar på ett näckrosblad vid kanten — kvackar en STÄMD stigande ton för varje insekt (skalan klättrar mot målet), hejar när grodan tumlar. |
| **finish** | Mätt, rund groda → jätterap som blåser en bubbelring över dammen → grodan gör magplask (våg på ytan) → grodkören kvackar en melodi i stämd skala. |

**Röstrepliker**
```
"Tryck där tungan ska fastna! Fånga flugorna!"     (intro — voiceIntro)
"Tryck på grodan, så hoppar den!"                   (om-cue)
"Mums! En fluga till!"                              (beröm, utrop — hoppas över om något talar)
"Prova att fastna i grenen!"                        (kreativ om-cue)
"Hoppsan! Grodan tumlade runt!"                     (motgång, utrop)
"En humla! Den drar i tungan!"                      (händelse)
"Magen är nästan full!"                             (nära mål)
"Vilken mätt groda! Kvack kvack!"                   (före complete())
```

**Val som gjordes på kortet (godkända av ägaren):**
- **Bara tryck, inget drag.** Tryck = tunga, tryck på grodan = hopp. Inom P0, och tungan är
  huvudkontrollen. Ett sikta-och-dra-hopp (slangbella) går att lägga till senare.
- **En skärm, ingen scrollande värld.** Utmaningen kommer från HÖJDEN — insekter högt upp kräver
  att man svingar sig eller hoppar och skjuter tungan i luften.
- **Ålder 3–5** — den äldre änden; ett spel där man försöker flera gånger.
- **Deep.** Ragdollen, tungans fysik och musklerna byggs av EN hand (orkestratorn) så fysiken
  hänger ihop; agenter får scen/ljud/kritik.

**Ägarens tillägg 2026-09-24 (superhoppet), ordagrant:** *"Kan vi göra så grodan har ett superhopp
läge med spelaren som styr höjd och längd genom att hålla in fingret på grodan och då i hoppet gör
grodan en volt, i luften så lägger han sig i profil med alla 4 fötter utsträckta och vi ser magen
medans han roterar slumpmässigt gradvis och kroppen går in i ragdoll läge så armar och ben flänger
lite […] hålla in på honom och vi ser hur han tar sats och gör sig redo, grodan gradvis indikerar
hela tiden man håller in på honom att hoppet kommer bli kraftigare, tex skakar efter ett tag och
fokuserer. I hoppet kan grodan fortfarande äta insekterna han hoppar in i samt man kan trycka på
honom i luften under ett superhopp och använda tungan men tungan åker bara ut och sen går in i soft
body / ragdoll läge med och får en rep liknande effekt varav saker & insekter som kolliderar med
tungan fastnar […] efter grodan har tumlat klart vid landning så väntar vi nån sekund efter han
stannat helt och då vaknar han till och justerar sig samt att tungan åker in med alla insekter som
fastnat och släpper annat som inte kan ätas. Sen vill vi ha en funktion som resettar / återställer
grodans position till spawn punkten […] genom att tex hålla in på grodkören […] (helst en knapp
som smälter in nånstans i spelet)."*

Val som gjordes i bygget:
- **P0 och långtryck.** P0 säger NEJ till långtryck, därför är hållet ett TILLÄGG och inte en grind:
  ett kort tryck (< 0,3 s) är exakt samma vanliga hopp som förut, och ingenting i spelet kräver att
  man kan hålla. Satsen syns och hörs direkt vid trycket (< 100 ms), och hoppet kommer vid släppet.
- **"Styr höjd och längd"** = hur länge fingret hålls. Samma vinkel, mer kraft, så båda växer
  tillsammans. Den som håller kvar efter full sats får ett hopp av sig självt efter 1,2 s (grodan
  "orkar inte vänta" — ingen kan fastna i satsen).
- **"I profil … vi ser magen"** tolkades som stjärnläget: grodan platt med magen mot oss och alla
  fyra benen ut, som en tecknad fallskärmshoppare. Det är en egen vy, med samma kroppar och en
  annan ledgeometri (se §4c).
- **Repet åker ut mot fingret** när man trycker bredvid grodan, och dit hjässan pekar när man
  trycker PÅ grodan ("tungan åker bara ut"). Ett rep per hopp; fler tryck snärtar det mot fingret.
- **Grodkören är hem-knappen** (håll 2,5 s — samma som P0-grindens nollställning, en ring fylls runt kören, ungarna kvackar en stigande
  skala). Ett kort tryck får kören att heja. Kören ligger i hörnet under spelytan, så ett barn
  hamnar sällan där av misstag.

**Ägarens tillägg 2026-09-24 (biomer + bajsloopen), ordagrant:** *"Istället för bara ha en damm
bana vill vi ha slumpmässiga varierande banor med olika biosfärer där varje biosfär har dess
fysiska egenskaper och objekt / hinder och plattformar anpassade av miljön (dammen, skogen, öken,
träsk, snö damm som är frusen, fors med strömmande vatten, sandstrand, innomhus kök, innomhus
vardagsrum, innomhus badrum) vi vill kunna utforska mer av världarna sidleds och hoppa uppåt mer
så kameran / skärmen följer med. Fler insekter och djur som är anpassade efter miljön och banan.
Istället för att banan tar slut direkt efter ett visst antal insekter så vill kunna fortsätta och
när vi uppnått att äta till gränsen där vi egentligen skulle klarat banan så bajsar grodan ut
olika typer av bajs som baseras på vad man ätit. Målet som gör att man klarar banan är att bajsa
ut 3 olika bajskorvar och mata grodkören med dem (en bajskorv för varje kör medlem). Man kan
använda tungan och stoppa in bajskorven i munnen för att bära den och då kan man inte äta mer
under tiden man bär den i munnen, när man är i närheten av grodkören kan man trycka på dem för
att kasta ut bajskorven mot en av dem och när alla 3 fått varsin klarar man banan."*

Val som ägaren gjorde (frågat 2026-09-24):
- **`/polera`, inte `/storbarn`.** Inget i önskemålet handlar om storbarnens motgång (liv, poäng,
  mindre hjälp) — allt är innehåll och ett nytt mål, och allt ryms i småbarnens P0. En värld
  större än skärmen finns redan i ett 3–5-spel (`spindel-zacke-svingar`). Ett senare
  `/storbarn grodan-slurp` ärver biomerna och lägger bara till det svåra.
- **Vilka tre korvar som helst** klarar banan. Sorten följer maten och syns, men ingen dold regel.
- **Med en korv i munnen svingar tungan men äter inte.** Insekter studsar mot munnen.
- **Leveranser** (§4d): L3 bajsloopen på dagens damm → L4 kamera + större värld → L5
  biomramverket + is/fors/skog → L6 träsk/öken/strand → L7 kök/vardagsrum/badrum. Bajsloopen
  först, eftersom den är det vi inte vet om en treåring klarar — det ska vi veta innan tio biomer
  byggs ovanpå den.

## 1. Nuläge (sett som spelare)

**Siktet och vändknappen (v1.260.0, ägarens önskemål 2026-09-24).** *"en liten knapp nere till
höger som vänder grodans håll … då det inte alltid fungerar att vända genom att klicka på ena
sidan av den samt att då åker tungan ut"* och *"när vi håller in fingret på grodan för superhopp
så vill vi se en diskret / halvtransparent animerad pil (trajectory path) som hela tiden
uppdaterar banan … samt att man kan justera den genom att dra med fingret för att bestämma
riktningen"*. Håller man på grodan tonar en prickad båge in efter 0,3 s (direkt om fingret drar):
vita halvgenomskinliga prickar som glider från grodan längs banan, en pilspets i änden och en
skugga (på vattnet en ring) där fötterna landar. Bågen växer med satsen och blir gräddgul vid full
sats. Drar fingret bort från grodan (mer än 60 px) går hoppet DIT fingret är — grodan vänder sig
och tittar dit — aldrig flackare än 30°. Ett kort tryck utan drag är fortfarande ett vanligt hopp,
men ett kort tryck som DRAR blir ett superhopp åt det hållet. Den som siktar får 3 s efter full
sats innan grodan hoppar själv (annars 1,2 s). Vändknappen är en liten ljus bubbla (bild r 32,
träffyta r 60) med ett grodhuvud i profil som tittar åt samma håll som grodan och två gröna pilar:
tryck = grodan vänder sig med ett litet skutt, huvudet i knappen vänder med den och pilarna snurrar
ett halvt varv. Mitt i ett superhopp (stjärnläget har ingen sida) vickar knappen och grodan kvackar.

*(v1.254.0, nattpasset 2026-09-23/24.)* En damm från sidan: himmel efter tid på dagen (eftermiddag
först, sedan morgon eller skymning), ett stort träd på ena sidan med en gren över vattnet,
kaveldun i kanterna, 2–4 näckrosblad (några med blommor), en mossig sten, en flytande stock och
vatten med växter och ytvågor. Tre grodungar sitter på ett eget blad i förgrundshörnet.

Grodan är en **aktiv ragdoll** med tolv kroppsdelar (huvud, kropp, 2×överarm+underarm,
2×lår+underben+fot) och leder med vinkelgränser. Musklerna håller en hopkrupen sittpose. I
hoppet sträcks benen, i luften ligger de bakåt, och inför landningen tar de emot. I vattnet simmar
grodan bröstsim. Efter en smäll slaknar musklerna och grodan tumlar som en ragdoll med yrselstjärnor
och omtöcknade ögon, och sedan samlar den sig. Ögonen följer närmaste insekt, blinkar och trycks
ned när grodan sväljer. Halssäcken blåses upp när den kvackar. Magen växer för varje insekt.

**Tryck någonstans** och tungan skjuts dit och fastnar i det första den träffar. En insekt rullas
in, och grodan sväljer (GULP). Grodungarna kvackar en stigande durskala. En gren, sten, vass eller
strand är fast, så grodan slungas dit och dinglar i tungan. En lätt kotte kommer farande till
grodan. Den tunga stocken drar grodan mer än den själv rör sig. En sköldpadda eller anka i
tungan ger vattenskidor. **Tryck på grodan** så hoppar den; i luften kvackar den i stället.

Målet är 8 insekter. Finishen: en jätterap med en bubbelring, ett högt hopp, ett magplask med
våg, grodkören, sedan `complete()` och en ny damm.

**Superhoppet (v1.255.0). Håll fingret på grodan.** Grodan tar sats: den hukar djupare, trycks
ihop, kisar och blåser upp halssäcken, och en stämd skala klättrar. Efter halva satsen darrar den,
och vid full sats glittrar det och en trill går. Vid släppet hoppar den högre och längre ju längre
fingret hölls. I luften gör den en volt (en dubbelvolt vid full sats) och SLÅR UT till stjärnläget,
där den ligger platt med magen mot oss och alla fyra benen utsträckta. Den snurrar långsamt åt ett
slumpat håll, lemmarna flänger och pupillerna rullar. Allt den far in i (med munnen, huvudet eller
magen) äts, och lemmarna knuffar undan insekter de sveper förbi. **Tryck i luften** så åker tungan
ut som ett mjukt rep, 13 länkar som flänger med och klibbar. Insekter som nuddar det fastnar. Saker
fastnar också (högst två): en gren eller sten blir ett ankare grodan dinglar i, och en kotte hänger
med. Fler tryck snärtar repet mot fingret. Vid landningen tumlar grodan som en slak ragdoll. När
den legat still en sekund sluter den ögonen, vaknar till, kommer upp på benen med ett litet hopp
och slurpar in repet som spagetti. Varje insekt på repet blir ett eget GULP med en egen ton i
kören, och allt annat släpps.

**Grodkören är hem-knappen.** Håll 2,5 s på de tre ungarna: en ring fylls runt dem, de kvackar en
stigande skala, och grodan kallas hem till startbladet. Det fungerar även mitt i ett superhopp. Ett
kort tryck får kören att heja.

**Bajsloopen (L3, v1.257.0).** Rundan tar inte längre slut när magen är full. Efter 8 insekter
sätter sig grodan (eller flyter), krystar (hukar, kisar, darrar, ett ansträngt "nnngh" i tre tag)
och ploppar ut en **bajskorv** bakom sig med ett prutt och ett plopp. Kören hejar. Korven är brun
med en led per insekt i den ordning de åts, och det ovanliga färgar sin led: rosa med prickar
(fjäril), gul med rand (humla), turkos (trollslända), grön med sken (eldfluga), guld med glitter
(guldfluga). Den flyter, stinklinjerna stiger och vattnet för den sakta ut ur vassen. **Tryck på
korven** så hämtar tungan den in i munnen, och grodan bär den som en pinne i en hundmun. Då
längtar ungarna: de gapar och skuttar ivrigt. Med korv i munnen kan tungan svinga i grenar men
inte äta, och en insekt som flyger in i munnen studsar av ("mmf"). En kotte, fisk, sköldpadda
eller anka som smäller till grodan kan knocka ut korven. **Tryck på kören** så flyger korven i en
båge till ungen närmast fingret. Ungen gapar, tuggar, sväljer (GULP, en stigande ters) och får
rund mage i korvens färgton. Nästa korv kommer efter 5 insekter. När tre ungar är matade rapar de
varsin ring i sin korvfärg, grodan en stor, sedan magplask, kören sjunger och rösten säger "Alla
grodungar är mätta! Kvack kvack!".
Skärmdumpar: `.test-shots/grodan-slurp.png`, `_grodspel-*.png`, `_grodfinal-*.png`, `_grodbild.png`,
`_bajsbild-0…3.png` (fri korv · bär · kast · matade ungar), `_bajsloop-*.png`.

## 2. Ursprunglig plan & tankeprocess

Kärnan är en ÄRLIG fysikregel som barnet kan upptäcka själv: *tungan drar lika hårt åt båda
hållen — den som är lättast flyger.* En fast gren slungar grodan, en humla rycker den, ett löv
kommer flygande. Det är samma regel varje gång men aldrig samma utfall, eftersom ragdollen,
vattnet och de rörliga sakerna gör varje studs unik. Det är där "inte låst vid samma animationer"
bor: inget i rörelsen är en förinspelad animation, allt är kroppen som reagerar.

"Lära sig att inte ge upp" ska kännas som *lek med misslyckande*: missen är rolig (tungan
snärtar tillbaka, grodan tumlar, plask), aldrig ett straff, och det finns alltid en lätt fluga
inom räckhåll så en 3-åring får sitt GULP inom sekunder medan en 5-åring jagar trollsländan
uppe vid grenen.

## 3. Vad gör det lättjefullt / tunt

**Spelkritikern 2026-09-24 (L3, bajsloopen):** 8 av 8 punkter höll, "klar att committa".
Starkast: kopplingen mat → korvens färger → ungens magfärg ("barnet kan SE sambandet"). Tre fynd
åtgärdades direkt: kasta-tipset sades bara en gång per sidladdning (nu en gång per runda), det
var svårt att se vilka ungar som var matade (en matad unge vaggar nu nöjt), och kombinationen
korv i munnen + superhopp var omätt (`_bajssuperprobe` 3/3: korven kvar, repet fångar inget,
0 ätna under bärandet). Kvar, medvetet:
- **Rundlängden för en riktig treåring.** En runda kräver 18 insekter (8 + 5 + 5) och tre
  hämta-bära-kasta-cykler. Sonden klarar det på 46–70 s, men ett barn är långsammare och lär sig
  mekaniken samtidigt. Varje steg har egen belöning. Spaken om det känns segt: `NASTA_KORV` 5 → 4.
  Se ett barn spela först.
- **Kören kastar i stället för att kalla hem** medan grodan bär en korv (ett tryck på kören är ett
  kast). Det skadar inget, och grodan som står vid kanten hoppar ut av sig själv (`_autohjalp`).
  L4 flyttar "grodan hem" till en egen skärmknapp ändå.

**Spelkritikern 2026-09-24:** 7 av 8 punkter höll före åtgärderna nedan, varav mottagaren och de
fristående objekten klart. Tre fynd åtgärdades direkt: röstklippen saknades, den mätta magen syntes
knappt, och "munnen äter själv" från specen var inte byggd. Det som fortfarande är tunt:
- **Slumptryck i insektsbandet får hjälp av sikthjälpen (84 px).** Det är avsiktligt (P0: ett barn
  som trycker NÄRA en fluga ska få den), men det gör de första fyra flugorna nästan gratis.
  Utmaningen bor i andra halvan: insekter utom räckhåll, väjningar och motgång.
- **Skalets hörnknappar** (hem är medvetet ogrindad) hölls fria i två steg. Insekterna har ett
  lägre tak i hörnkolumnerna (`insekter.js` `taketVid`), och grenen sitter nu på y 150–185, under
  knapparnas träffyta (`dammen.js` `_planera`). Förut låg grenens bas i hemknappens träffyta när
  trädet stod till vänster.
- **Kören och finishen hörs med robotröst** tills `npm run voice` körts (gjordes i nattpasset).

Uppmätt under bygget (så att nästa pass inte behöver gissa):
- `_grodprobe.mjs` (Node): sittposens posfel är 0,16 rad, mot 1,15 för kontrollarmen utan
  muskler. Den lätta kotten flyttar grodan 0,10 av kottens sträcka (Newton 0,09). Den tunga
  stocken ger 1,62× (förväntat 1,57). Hoppet är 198 px och grodan sitter igen efter 1,2 s. Efter
  en smäll är den slak i 1,1 s och samlar sig sedan.
- `_grodspelprobe.mjs` (Chrome): riktade tryck ger 17–22 ätna/min, och en runda tar ~30–45 s för
  en exakt sond. **Blinda** tryck, minst 150 px från varje insekt, ger 4,7/min, nästan bara via
  den sena autohjälpen. Skicklighet avgör alltså, och ingen fastnar. 0 konsolfel, inklusive exit
  mitt i ett tungdrag och återinträde.
- Två buggar hittades bara med sonden: ① grodan bland vassen fick varje tungskott att fastna
  direkt vid munnen (284 av 286), och ② skötseln spawnade en ny "lätt fluga" var 0,6 s medan
  den förra flög in utifrån (6 flugor efter 4 s). Båda syntes aldrig i ett grönt test.

Uppmätt i L3 (bajsloopen, 2026-09-24):
- `_bajsloopprobe.mjs` (Chrome, ett målmedvetet otåligt barn): **5 av 5 rundor klara på 46–70 s**,
  första korven efter 14–22 s, högst en korv åt gången. 0 konsolfel, och exit mitt i ett kast,
  mitt i en krystning och med korven på väg in på tungan gav 0 fel efter återinträde. Rundan är
  alltså ~1,5× den gamla (30–45 s för 8 insekter) för en exakt sond. En riktig treåring är
  långsammare, men ingenting kan misslyckas och varje korv firas.
- **VASS-FÄLLAN** (hittad av `_bajsloopprobe`, inte av något test): en runda stod still i **590 s**.
  Grodan låg i vattnet vid kanten, vänd MOT väggen och omgiven av fyra vasstrån, med en insekt i
  magen och ingen korv. Mekanismen rör ingen L3-kod. Alla 576 tungskott fastnade i vassen (skotten
  mot insekterna passerade stråna precis framför munnen), hoppen från vattnet gick åt det håll
  grodan tittade (in i väggen), och den sena hjälpens tjockfluga hamnade bakom vassen.
  `_vassfalleprobe.mjs` bygger läget med flit: **kontrollarmen 4/6 kom loss** (ett pass åt 0 på
  40 s, 128 av 128 skott i vassen; 419/663 = 63 % i vassen totalt). Med rättelsen **6/6 loss**,
  121 ätna mot 73, **65/537 = 12 %** i vassen. Rättelsen: grodan vänder sig mot målet även i
  vattnet, hopp vid kanten går in mot dammen (`_bortFranKanten`, `groda.hoppa` vänder även i
  vattnet), och den sena hjälpen hoppar ut en groda som står vid kanten.
  ⚠️ **Rättat i L4:** texten här sa också "vassen klibbar bara när fingret pekar på strået" — den
  regeln var skriven men DÖD i v1.257.0. Omslaget `hitta.inuti: (x, y) => this._inuti(x, y)`
  skickade aldrig vidare tungans mål, så `_inuti` fick `tx === undefined` och returnerade tidigt.
  L3:s 6/6 kom alltså helt från de tre andra rättelserna. Hittat i L4 när samma fälla uppstod vid
  den döda stammen och rättelsen inte bet (`_stubbdiag.mjs`: `_inuti` direkt gav stammen i
  listan, tungans egen `_undanta` gjorde det inte). Mätt efter att omslaget skickar målet: se §3
  L4.
- `_grodfastprobe.mjs` (envis strategi: alltid närmaste insekt, inga hopp): 6 pass × 90 s, 12–29
  ätna, längsta lucka 29 s (insekter högt uppe utom räckhåll — andra halvans design, hjälpen kom).
- Regression: `_grodprobe` oförändrad (posfel 0,16 · hopp 200 px · kotte 0,09 · stock 1,64),
  `_superspelprobe` 4/4 superhopp klara, kort tryck = vanligt hopp 192 px, kören kallar hem mitt i
  ett superhopp (7 px från start), exit med repet ute 0 fel.
Uppmätt i L4 (den stora världen, 2026-09-24) — sex fällor hittade och stängda på vägen, alla med
0 konsolfel och grönt test:
- **Bajsloopen i världen:** `_bajsloopprobe` (kamerakunnig: trycker bara på det som syns, GÅR mot
  resten) 4/4 rundor klara på 109–168 s (L3 på en skärm: 46–70 s), grodan över hela bredden.
  Första versionen: 0/4 (stubb-fällan), sedan 3/4 (stubben som vägg), sedan 2/3 (under ett blad).
- **Stubb-fällan:** grodan tätt intill den döda stammen — varje skott mot insekterna fastnade i
  stammen. `_vassfalleprobe --falla stubbe` kontroll 1/6 loss, 694/756 skott i stammen → 6/6,
  1/320. Rättelsen bet först när `hitta.inuti` skickade tungans mål (L3-rättelsen var död).
- **Stubben som vägg:** från botten till 185 px över ytan delade den dammen — grodan drogs in i den
  och kom aldrig förbi. Nu ett rent tungmål (krockar med ingenting), grenstumparna fasta.
- **Under ett blad:** en groda som simmade in under ett näckrosblad hölls där av flytkraften i 9
  min. Bladen är nu envägsplattformar (som grenarna).
- **Startbladet:** med envägsbladen föll grodan igenom startbladet vid start och vid "hem" (4/4 i
  `_startbladdiag`) — bladet grodan placeras på är fast från början.
- **Klättra:** `_klatterprobe` 4/4 når alla tre grenarna, kameran följer upp till y ≈ −170, grodan
  aldrig utanför bild; ned igen på 1–12 s. Vägen dit: 0/4 (grenavståndet ~300 px) → mellangrenen
  ovanför bildkanten (kameralyft) → samma gren i vägen (`forra`) → benen krokade under grenen
  (`_grendiag`, envägs med HELA grodan) → vägen ned dold (lyftet 200 → 110 px).
- Regression: `_superspelprobe` 4/4 superhopp, kort tryck = hopp 192 px, hem-bladet mitt i ett
  superhopp → 6 px från start; `_bajssuperprobe` 3/3 (korven kvar, 0 ätna, kast → matad);
  `_grodprobe` oförändrad; `spindel-zacke-svingar`, `plask-i-vattnet`, `pruttbad` gröna (delar
  `kamera.js` resp. `flytkraft.js`). Parallaxen mätt: 1280 → 384, 720 → 216, himmel/HUD 0.
- `physics.js`: "kropp rymde"-diagnosen räknar nu mot världens `bounds` (en stock på x 1999 i en
  2560 bred damm larmade).
Uppmätt i L5 (biomerna, 2026-09-24):
- `_bajsloopprobe --biom X`: hela loopen klar i isen (139 s), forsen (211 s), skogen (212 s) och
  dammen (104–183 s), ingen fastnade, 0 konsolfel, exit-proven 0 fel. `_klatterprobe` 3/3 (biomen
  byts vid varje start, så varven gick i olika biomer), `_vassfalleprobe --falla stubbe` 4/4 loss.
- `_svampprobe`: 5/6 fall mot en flugsvamp (8 och 16 px/steg) studsar 29–195 px och landar på
  hatten, 1/6 studsar av åt sidan och landar på marken (inte igenom); ett riktigt superhopp intill
  en svamp går hela vägen. `_varldbildprobe --biom X` fotar varje biom från sju kameralägen — den
  hittade skogsmarkens polygon som bara ritade ena bitens kant (fjärranbandet lyste igenom).
- `npm run test:all` 86/86 gröna (tre delade bibliotek ändrades: kamera, fysik, flytkraft).
- **Spelkritikern L4+L5:** 8/8, "klar att committa", inga P0-brott. Starkast: biomerna känns olika
  att SPELA (isens glid, forsens ström som hjälper, skogens drag-längs-marken), inte bara att se.
  Åtgärdat: nästa korv efter 4 insekter i stället för 5 (rundan var 109–212 s för en exakt sond),
  vintergrenarna hade gröna lövknippen och mossa (nu bara snö), superhopp mot svamp mätt. Kvar,
  kosmetiskt: högt uppe ritas trädkronan in bakom skalets hörnknappar (ingen träffyta påverkas).
- `_bajsbildprobe.mjs` ställer upp lägena en spelsond aldrig hinner fota. Första korven (rena
  färger, 24 px tjock) läste som ett pärlband eller en larv, inte som bajs, och försvann bakom
  grodan. Nu 32 px, brunt med insektsfärgen inblandad och tydligare stinklinjer.

## 4. Förbättringar & förhöjningar (plan)

### 4a. Teknisk ritning — LEVERANS 1 (det som byggs i nattpasset)

**Motor: matter.js via `PhysicsWorld`, EN motor** (skill **fysik-spel**). Vatten via
`lib/flytkraft.js` (`Flytvolym`). Ingen egen integrator bredvid.

**Filer** (mönster: `unika-knytt/`, `hamburgerbygget/` — flera moduler i spelmappen):
- `index.js` — GameModule, rundflöde, input, röst (**ALLA `voice.say('literal')` HÄR** —
  `check.mjs` läser bara `index.js`), mål, motgångsschema, finish.
- `groda.js` — ragdollen: kroppar + leder + muskler (pose-PD) + ritning per kroppsdel.
- `tunga.js` — tungskottet: stråle, fäste, konstraint, indragning, ritning.
- `insekter.js` — insekterna (flygbeteenden, fångst, sällsynta varianter).
- `dammen.js` — scen: vatten, ytvåg, näckrosblad, vass, grenar, stenar, stockar, tid på dagen,
  grodungarna.
- (ev. `hinder.js` — kotte/sköldpadda/fisk/vind/anka.)

**Ragdollen (`groda.js`):**
- 11 kroppar, alla i samma negativa `collisionFilter.group` (delarna krockar inte med varandra).
  Huvud + kropp tyngst; ben lätta men långa (grodans lår + underben + lång fot = Z-vikning).
- Leder = `Constraint` med `length: 0` mellan ankarpunkter (`pointA/pointB`) på grannarna,
  hög `stiffness`. **Matter har inga vinkelgränser** → egen gräns i `phys.beforeStep()`: läs
  relativ vinkel per led, klämt mot [min,max] med en mjuk korrigering av `angularVelocity`.
- **Muskler = PD mot en målpose** per led, i `beforeStep()` (EN gång per fast steg — aldrig per
  bildruta). Poser: `sitt` (hopkrupen, ben vikta), `hopp` (utsträckt), `sim` (bröstsimscykel),
  `slak` (styrka 0). Muskelstyrkan är ett tal 0…1 som faller till ~0 vid en hård smäll och
  kryper tillbaka på ~0,8–1,2 s → ragdoll-tumlet är äkta, återhämtningen syns.
- Uppräta sig: när grodan ligger stilla på blad/sten med fel sida upp, ett litet vridmoment på
  kroppen + `sitt`-posen (inte en teleport).
- Magen: en skalär `mage` 0…1 som växer per insekt och ritas som magens radie (kroppens
  kollisionsform får gärna vara oförändrad — det är bilden som blir rund).
- **Ritning:** varje kroppsdel är en egen `Container` som följer sin kropp (`link`), med
  ritad silhuett (inte ellips-klumpar): huvud med bulliga ögon ovanpå, bred mun-linje,
  näsborrar, prickig rygg, ljus buk, tåkuddar, simhud mellan tårna på bakfoten. Ögonen tittar
  mot tungans mål / närmaste insekt. Blinkar. **Egna fält får inte heta `_cx/_cy/_sx/_sy`.**
  Bågar via `bage()` ur `lib/form.js` (arc-fällan).

**Tungan (`tunga.js`):**
- Tryck → stråle från munnen mot tryckpunkten, max räckvidd ~420 px (klipp tryckpunkten till
  räckvidden). Första träff: `Matter.Query.ray` mot dammens kroppar + egen punkt-mot-segment-
  test mot insekter (insekter är INTE matter-kroppar — de är lätta, egenstyrda). Skottet tar
  ~0,12–0,18 s ut (tungan syns flyga, rep-ritning med klibbig tjock spets).
- **Fäste på en kropp:** `Constraint` mellan huvudets munpunkt och träffpunkten i kroppens
  lokala rum, låg `stiffness` (fjädrande), och längden dras in i `beforeStep()`. Matter fördelar
  kraften efter invers massa → **tung/statisk = grodan flyger dit, lätt = saken kommer**. Det är
  hela idén i ägarens ord ("tyngre saker med mer massa så åker grodan mot det fortare"), gratis ur
  fysiken. Ingen specialkod per föremålstyp.
- När längden nått sitt minimum: grodan **dinglar kvar** i tungan (svingar) tills nästa tryck.
  Tryck igen → släpp + nytt skott mot den nya punkten. Tryck på grodan medan den hänger →
  släpp + hopp. Auto-släpp efter ~6 s hängande (plask).
- **Insekt:** fastnar på spetsen, tungan dras in snabbt (~0,2 s), insekten följer spetsen in i
  munnen → GULP (kinderna puffas, halsen sväljer, magen växer, grodungarna kvackar).
- **Humla** är en insekt MED massa: den blir en kinematisk dragare som rycker i tungan några
  sekunder innan den ger upp och äts ("En humla! Den drar i tungan!").
- Tomt skott / bom: tungan snärtar ut till räckvidden och tillbaka med en slurp och en liten
  vippning — roligt, aldrig fel-ljud.
- **Munnen äter själv:** en insekt som kommer inom ~40 px från munnen medan grodan flyger äts
  (ägarens "flugor åker in i munnen och äts").

**Hopp:** tryck på grodan (träffyta ≥96 px + 24 px halo runt huvud+kropp — P0) → `hopp`-pose +
impuls på kropp/lår uppåt-framåt i blickriktningen. I vatten: ett simtag + mindre hopp.
Kan hoppa igen först när grodan nuddat något (inget oändligt lufthopp — men tungan funkar i
luften, och DET är kombinationen som ger kreativiteten).

**Dammen (`dammen.js`):** vattenyta ~y 540 över hela bredden (Flytvolym), 2–4 näckrosblad
(flytande, lätt sjunkande under grodans vikt — statiska plattor med fjädrande gupp duger om
flytande blir instabilt; MÄT), vass vid kanterna (tunn statisk kropp som tungan kan fastna i),
en trädgren överst (statisk, tungan fastnar → sving), 1–2 stenar (statiska, hårda — grodan
studsar, använd `studs` opt-in för studs mot statisk kropp), en flytande stock (tung, dynamisk).
Layout slumpas per omgång inom säkra zoner. Ytvåg vid plask: höjdfält (se `pruttbad` +
minnet "Ytvågor via höjdfält" — dämpning SIST, styr omritningen på rörelse).
Tid på dagen: `morgon` / `eftermiddag` / `skymning` (eldflugor lyser, himlen i toner).
Grodungarna: tre små ritade grodor på ett blad vid kanten (EJ i spelytans väg), kvackar i
stigande durskala per insekt (`audio.tone`, ingen UI-blipp), hejar vid tumling.

**Insekter (`insekter.js`):** egenstyrda (wander + sinusflykt, ingen matter). Typer: fluga ·
mygga · trollslända (pilar mellan punkter) · fjäril (fladdrig, högt) · humla (massa) · eldfluga
(skymning) · guldfluga (sällsynt, ~1 av 6 omgångar). Högst ~5 samtidigt. **Alltid minst en lugn
fluga inom räckhåll från grodans nuvarande läge** (autohjälp). Efter ≥4 bommar i rad: en tjock
fluga sjunker ner mot grodan. Surr: mjuk stämd ton-vibrato, inte ett klipp i loop (eller
`audio` loop som stoppas i destroy — se `stopAllLoops`).

**Motgång (tak = EN aktiv):** kotte (dynamisk kropp som faller från grenen), sköldpadda
(kinematisk, simmar längs ytan, hårt skal), fisk (hoppar i en båge ur vattnet), vindpust
(`setWind` kort). Anka = sällsynt wow, tungan kan fastna → vattenskidor. Schemat startar efter
2 insekter, var 10–15 s, och ALDRIG under finish.

**Mål + finish:** 8 insekter. Efter nr 6: "Magen är nästan full!". Nr 8 → spelet släpper
tungan, grodan landar/flyter, rund mage → jätterap (bubbelring som rullar över dammen, ljud:
stämd låg glissando + `pop`-bubblor) → magplask (våg) → grodkören (tre ungar + grodan) kvackar
en kort melodi i durskala → säg "Vilken mätt groda! Kvack kvack!" → `progress.complete()`.
Ny omgång: ny damm, ny tid på dagen, magen tillbaka.

**Kapa-mönster (exit-säkert + återspelnings-säkert):** `ctx.later` för alla fördröjningar ·
`_alive` · alla konstrainter tas bort före `phys.destroy()` · `killTweensOf` på VARJE innernod
som tweenas (barnbarn!) · repliker via `ctx.narTyst` (instruktion) eller `if (!voice.talar)`
(utrop). Spela TVÅ rundor otåligt i sond innan commit.

### 4c. Superhoppet — teknisk ritning (LEVERANS 2, byggd v1.255.0)

**Faser** (`groda.superFas`): `ladda` → `volt` → `stjarna` → (spelet) `vakna()`. Spelets egna
faser (`index._super.fas`): `luft` → `mark` → `vaknar` → `uppe` → klart.

- **Sats** (`ladda`): målposen glider från `sitt` mot en djupare `ladda`, och bålstödets vinkel
  planar ut. Resten är BILD i `rita()`: vyerna trycks ihop mot fötterna (15 %), darrar efter halva
  satsen och kisar. Kropparna rörs inte av bilden.
- **Volt**: `knuffa` + ett STELT snurr kring tyngdpunkten (`_snurra`). Snurret hålls uppe mot
  voltfarten i luften (grodan "kastar sig runt"), och kulposen `volt` drar in benen. Bara kontakt
  UNDER grodan (`_markUnder`, kontaktpunkten lägre än kroppsdelens mitt) räknas som landning. Ett
  slag i grenen ovanifrån är en studs, och stjärnan slår ut först när grodan är fri.
- **Stjärnläget**: `_geometri(true)` byter ledernas pa/pb/lo/hi/mitt mot `STJ` (speglad för
  B-sidan), `stall('stjarna')` lägger ut lemmarna kring bålen, och tyngdpunkt, fart och snurr
  behålls. Vyerna byter lager (alla lemmar bakom bålen), tonen (ingen grånad sida) och ritning
  (`ritaMage`, `ritaHuvudFram`). Huvudets vinkel är bålens + π/2. Munnen sitter på (0, 12) i
  huvudets rum. Hoppet i bilden döljs av att stjärnan slår ut (`_popp`, 0,16 s).
- **Luftfasen släpper tre bromsar** som annars äter snurret och höjden (se CLAUDE.md, tysta fällor):
  ledernas `damping` 0,08 → 0,01, luftmotståndet 0,012 → 0,004, och grodan tas UR flytvolymen.
  Alla tre återställs vid landning (`_landar`). Fartspärren i luften spärrar tyngdpunkten (24) och
  snurret (18) var för sig.
- **Klibbrepet** (`klibbrep.js`): 13 länkar (r 6, 15 px) i grodans negativa grupp, fäst i munnen
  med en konstraint som flyttas vid vybyte (`nyMun`). Det klibbar via matters kontaktpar och via
  `Query.point` mot vassen (mask 0). Insekter fastnar på avstånd, och slurpen sker kinematiskt längs
  den sparade formen.
- **Vakna**: `vilSteg ≥ 60` (1 s stilla), eller 5,5 s efter landning, eller 11 s totalt. Grodan
  vaknar till (0,45 s, ögonen upp), sedan kommer `slurpa()` FÖRE `vakna()` (repets kroppar måste
  vara borta innan lemmarna läggs om).
- **Hem**: grodkören (`grodungar.plats`), håll 2,5 s → `_kallaHem` (avbryt super + teleport).

**Uppmätt** (`scripts/_superhoppprobe.mjs` i Node med spelets flytvolym, `_superspelprobe.mjs` i
Chrome):

| | höjd (tyngdpunkt) | längd | volt | stjärna efter | vila efter |
|---|---|---|---|---|---|
| vanligt hopp (kontrollarm) | 192 px | 59 px | — | — | — |
| superhopp, sats 0 | 267 px | 228 px | 0,90 varv | 33 steg | 156 steg |
| superhopp, sats 0,5 | 332 px | 561 px | 0,91 varv | 29 steg | 207 steg |
| superhopp, sats 1 | 382 px | 779 px | 1,82 varv | 51 steg | 175 steg |

- Stjärnposen håller: posfel 0,01–0,02 mot 0,48–0,76 för kontrollarmen med musklerna av (samma
  sprattel-störning i båda armarna). Efter `vakna()` sitter grodan med posfel 0,15–0,16, samma som
  sittposen i `_grodprobe`.
- Repet fastnar i en statisk gren på steg 8, grodan hänger i 54 steg, slurpen blir klar och grodan
  sitter igen. `_grodprobe` (den vanliga ragdollen) gav identiska tal före och efter ändringen.
- I Chrome: 4 av 4 superhopp gick hela vägen, med 2,8–4,3 s från släpp till klart. Ett kort tryck
  gav ett vanligt hopp (190 px, aldrig super). Grodkörens håll mitt i ett superhopp satte grodan
  13–15 px från startpunkten. Målet mitt i ett superhopp (repet bar tre insekter förbi målet, eller
  munnen i luften tog den åttonde) startade firandet EN gång, och nästa runda byggdes. Exit med
  repet ute, in igen och spel i 3 s gav 0 konsolfel.

- **Trycket syns inom 100 ms (P0).** Satsen började först på 0, så de första 90 ms syntes nästan
  ingenting. Nu hukar grodan en tredjedel av full sats på 0,08 s. `_satsprobe.mjs` mäter
  pixelsvängningen i grodans egna lager 90 ms efter trycket (blink, blick och kvack frysta):
  kontroll utan tryck 393–1 152 px, HEAD-vägen 1 709–2 505 px, ny kod 3 272–4 062 px (6 varv per
  arm, inga överlapp).

**Tre buggar som bara sonderna hittade:**
1. Ledernas dämpning dödade volten: 0,18 → 0,002 rad/steg på 40 steg, även med musklerna,
   gränserna och luften avstängda.
2. Node-sonden saknade spelets flytvolym, som dämpar vridning och spärrar farten även ovanför
   ytan. Snurret överlevde i sonden men inte i spelet, och full sats landade kortare än halv sats.
3. En groda som flöt fick satsen avbruten av ett enda gupp (sats 0,02, sedan ingenting), eftersom
   `iVatten` fladdrar vid ytan. Nu gäller `_naraVatten` (24 px över ytan) och 0,3 s nåd, och ett
   släpp mitt i ett gupp väntar in fästet.

**Spelkritikern 2026-09-24 (superhoppet)** höll 6 av 6 frågor: satsen syns, stjärnläget är "exakt
vad ägaren bad om", repet är begripligt och vaknandet tar rimlig tid. Två fynd åtgärdades direkt:
- *Blockerande:* grodkören stod på 2 s, men P0-grinden säger 2,5 s för en nollställning. Nu 2,5 s,
  och ett håll i 2,2 s kallar INTE hem grodan (uppmätt).
- *Stjärnläget åts upp av scenografin:* ett kort hopp som snuddade något, eller ett fullt hopp som
  studsade i grenen, landade utan att stjärnan syntes. Nu slår stjärnan alltid ut. Vid en landning
  mitt i volten lyfts den ovanför det grodan står på (`_tillStjarna(true)`: 0 delar inne i golvet,
  mot 9 i kontrollarmen utan lyftet; högsta delfart 5,7). Efter en studs slår den ut så fort
  grodan är fri, och annars senast när den börjat falla efter ett halvt varv. Med en gren rakt
  ovanför: studs på steg 7, stjärna på steg 16, landning på steg 20. I Chrome gav 5 av 5 superhopp
  stjärnläge (före rättningen 3 av 5).
- *Inte åtgärdat, medvetet:* ingen röstledtråd för grodkören. En replik som ber barnet hålla på
  kören skulle få grodan att kallas hem hela tiden, och ägaren bad om en knapp som smälter in.

### 4d. Biomer och bajsloopen — leveransplan (ägarens tillägg 2026-09-24)

- [x] **L3 — bajsloopen på dagens damm** (v1.257.0). Se §4e.
- [x] **L4 — kamera och större värld (dammen)** (v1.258.0). Se §4f. Planen nedan stod så här: `lib/kamera.js` med värld åt sidan OCH uppåt
  (egna `parallax()`-lager — `createScene` följer inte med i höjd). Kören blir ett ställe i
  världen (pil i skärmkanten + körgrodor som ropar när den är utanför bild). "Grodan hem" flyttar
  från kören till en egen fast skärmknapp (faktor 0), fortfarande håll 2,5 s. Kostnaden är känd
  (minnet *Kamerans första kund*): `ctx.fxLayer` är skärmrymd, `moveTo()` vid teleport, ~47
  ställen i `dammen.js`/`insekter.js` räknar med bredden 1280, och varje bakgrundslager måste
  delas upp per parallaxfaktor. `KAST_RACKVIDD` (hur nära kören man måste vara) föds här.
- [x] **L5 — biomramverket + is, fors, skog** (v1.259.0). Se §4g. Planen stod så här: En biom = fysik (friktion, ström, flytkraft),
  palett, plattformar, hinder och djur. Frusen damm: halka, vakar. Fors: strömmen för med sig
  grodan och korven. Skog: lodrätt, grenar överallt, lite vatten. `Dammen` blir en av flera.
- [ ] **L6 — träsk, öken, sandstrand.** Tjockt vatten/lera, en värld utan vatten, vågor.
- [ ] **L7 — kök, vardagsrum, badrum.** Eget bildspråk: möbler som plattformar, diskho/badkar som
  vatten, fruktflugor vid fruktskålen.
- Per biom: egna insekter och djur (ägarens "anpassade efter miljön") — och egna korvfärger.

### 4e. Bajsloopen — teknisk ritning (L3)

- **Magen:** `_iMagen` samlar insektstyperna sedan förra korven. Full mage = 8 insekter första
  gången (där rundan tog slut förut), sedan 5 (`FORSTA_KORV`/`NASTA_KORV`). Kvacket klättrar
  skalan mot toppen oavsett gräns.
- **Bajsa:** `_bajsUppdatera` väntar tills grodan sitter eller flyter (högst 6 s), sedan
  `groda.krysta()` (bara bild: hukar, kisar, darrar — ingen kropp rörs) och efter 0,95 s
  `_plopp`: korven ur bakänden (kroppens lokala −x), `fart`-klippet, kören hejar. Högst 3 korvar
  finns samtidigt (`Bajs.fullt`) — då väntar magen.
- **Korven** (`bajs.js`): en led per insekt i ätordning (4–8 leder), färg ur `KOST`; humla ger
  svart rand, fjäril prickar, guldfluga glitter. En riktig kropp som flyter och kan knuffas —
  men i grodans negativa kollisionsgrupp, så grodan aldrig sitter på sin egen korv.
- **Hämta:** tungan tar korven via insektsvägen (`hitta.insekt` → `tunga.js` 'bar'), sikthjälpen
  prioriterar en korv inom 70 px. Framme i munnen → `_taKorv`: grodan bär, ungarna längtar.
- **Bära:** tungan returnerar inga insekter (svingar bara), sikthjälpen är av, munnen äter inte
  själv (insekter studsar: "mmf"), superhoppet äter inte och repet fångar inga insekter
  (`Klibbrep.fangar`). En smäll från kotte/fisk/sköldpadda/anka knockar ut korven (styrka
  > 0,45, aldrig i superhoppet, högst var 8:e s).
- **Kasta:** tryck på kören med en korv → ungen närmast fingret som inte är matad; bågen är
  skriptad (siktet är gratis) och ungen gapar. Framme → tugga 1 s, GULP, rund mage i korvens
  färgton, en stigande ters. Ungen räknas som matad direkt, så nästa kast aldrig siktar dit.
- **Final:** tre matade → ungarna rapar var sin ring i sin korvfärg, grodan en stor, magplask,
  kören sjunger, "Alla grodungar är mätta!" → `complete()`.
- **Hjälpen** (sent, synligt): om-cuen efter läget (hämta korven / tryck på en grodunge) med en
  krusning på målet; efter bommar eller 25 s utan framsteg driver vattnet korven mot grodan och
  den glittrar.
- **Rivning:** `_nollaTunga()` ersätter `tunga.nollstall()` — en korv på väg in på tungan blir
  fri igen i stället för att hänga i luften. Inga tweens i `bajs.js` eller i kören.

### 4f. Den stora världen — teknisk ritning (L4)

- **Kameran** (`lib/kamera.js`, fick `worldY0`): världen är `VARLD_B` = 2560 bred och går från
  `VARLD_TOPP` = −720 ned till 720. Dammen ligger kvar på y 0–720 (inget redan ritat flyttades),
  himlen och träden växer UPPÅT. `worldY0` är standard 0, så `spindel-zacke-svingar` är orörd.
  Kameran följer grodans kropp (`lead 90`, `deadzone 140`), uppdateras i spelets egen bildruta
  EFTER fysiken, och `moveTo` används vid varje teleport (hem, rymde, ny runda).
- **Lagren:** `himmel` (faktor 0 — gradient, sol, moln, glöd, stjärnor; under horisonten fylls
  skärmen med horisontens färg), `fjarran` (`FJARRAN` = {x 0,3, y 0,3} — kullar, skog, bortre
  strand och vatten; när kameran klättrar sjunker bandet långsamt och det bortre vattnet växer),
  `this._scen` (faktor 1 — allt spelbart, i världskoordinater; sonderna räknar om via
  `_scen.toGlobal`), `hud` (faktor 0, skakar inte). Uppmätt: världen 1280 → bandet 384 (0,3),
  720 upp → 216, himmel och HUD 0 (`_varldbildprobe.mjs`).
- **`this._fx`** (= `L.effekt`, i världen) ersätter `ctx.fxLayer` överallt (skärmrum — effekterna
  hade hamnat fel). `_rivVarld` kör `stadFx` på varje lager före rivningen (partikelfälten cachas
  PÅ lagret).
- **`_vyNu`** = synlig världsyta (kamerans mitt ± `ctx.view`, med telefonens bleed), ETT objekt som
  skrivs om varje bildruta. Insekterna (gränser, hörntak som följer kameran, in-flygning från
  bildens kant), hindren (kotte ovanför bilden, sköldpadda/anka från bildens kanter, fisk nära
  grodan, vindlöv) och dammen (fisken, dimman) läser den i stället för 0–1280.
- **Dammen** (`dammen.js`): två stränder (`_byggStrand(1|2)`), ett högt träd på varje (`_byggTrad`,
  stam upp till −590…−650, grenar på tre höjder: ~165, ~−140, ~−400, toppkrona + en lövklunga
  längs varje lägre gren), en **stubbe** mitt i dammen (`_byggStubbe`: bruten stam ~400 px över
  vattnet, två grenstumpar; stammen är ett rent tungmål, grenstumparna fasta), 6–8 blad och 2–3
  stenar packade över hela bredden, förgrundsvass i klungor på fasta ställen i världen, kören vid
  ena stranden (`P.kor`). Grodan startar på bladet närmast världens mitt.
- **Insekterna uppåt:** hälften av de nya insekternas hem ligger i det barnet ser, hälften någonstans
  i dammen, och av de högt flygande sätter sig hälften bland trädens grenar (y −560…−110).
- **HUD:** HEM-BLADET mitt upptill (ett näckrosblad med en grodunge — hör till dammen, inte till
  skalet): håll 2,5 s = grodan hem (ringen fylls i HUD:en), kort tryck = ungen skuttar och kvackar.
  KÖRPILEN vid skärmkanten när grodan bär en korv och kören är utanför bild: tryck = kameran visar
  kören i 2,2 s och glider tillbaka (grodan flyttas inte). Samma "visa vägen" är den sena hjälpen.
- **Kasthåll:** `KAST_RACKVIDD` 800 px (i x) — längre bort vinkar kören bara ("Hoppa närmare
  grodkören!"). Framme med korven: "Tryck på en grodunge, så kastar grodan bajset!" (en gång per
  runda). Långt borta: "Grodkören väntar där borta!".
- **Simtag:** en groda som flyter och får ett tungskott ned i vattnet simmar åt det hållet — i en
  damm som är två skärmar bred ska man kunna ta sig fram utan något att fastna i.
- **Tungan passerar** vass och stammar som fingret inte pekar på, det munnen trycks mot, det
  grodan står på, och grenen grodan hänger i (`tunga.skjut`: `forra`) — om fingret inte pekar just
  dit (`_inuti` med tungans mål — omslaget skickar nu målet, se §3 L3-rättelsen).
- **Klättra** (`_klatterprobe.mjs` spelar det): tryck på grenen ovanför → tungan fäster, grodan
  svingar dit → nästa gren. Fem saker måste stämma samtidigt, och varje hittades av sonden:
  ⓵ grenavståndet ~200 px (en hängande groda har kroppen ~160–260 px under grenen; ~300 px var
  utom räckhåll); ⓶ kameran LYFTER (upp till 110 px ovanför grodan, `_kamMalUppdatera`) — annars
  låg nästa gren ovanför bildens kant; 200 px lyft dolde i stället vattnet och vägen NED;
  ⓷ grenen grodan hänger i är genomskinlig för nästa skott uppåt; ⓸ **envägsgrenar**
  (`_envagsgrenar`, grodans kategori `GRODA_KAT`): fast först när HELA grodan är ovanför, lös igen
  när kroppen är under ovansidan eller tungan drar nedåt — med bara kroppen som villkor krokade
  benen fast under grenen (`_grendiag`); ⓹ **hoppa ned**: uppe i trädet ger ett tryck på tom luft
  nedanför ett skutt ned genom grenarna (`_hoppaNed`), ett tryck på en lägre gren/ett blad går med
  tungan som vanligt.

### 4g. Biomerna — teknisk ritning (L5)

- **En biom är data** (`biomer.js`: `BIOMER`, `BIOM_PALETT`, `BIOM_ORDNING`): vatten (`oppet` ·
  `is` · `strom` · `gol`), plattformar (blad · stenar · stubbe · stockar · svampar), antal träd,
  snö, insekter, hinder, och färger OVANPÅ tid-på-dagen-paletten. `dammen.js` bygger efter den,
  `index.js` väljer insekter och hinder ur den.
- **Val av biom:** första rundan när spelet öppnas = nästa i `BIOM_ORDNING` (damm → is → fors →
  skog), sparat i `progress.custom.biomNasta` — barnet får en ny värld varje gång, och den som
  vill prova alla går ut och in. Inom en session: slump bland de andra. `_tvingaBiom` (sonder).
  Varje biom utom dammen får en egen kort replik efter instruktionen (`_sagBiom`).
- **Isen** (`_byggIs`): isflak mellan 2–3 vakar, kroppen från ytan ned till botten (vakarna är
  brunnar — ingen groda kan simma in under isen, samma läxa som bladen i L4), friktion 0,012
  (grodan och korven GLIDER), snö på stränder, stenar, stubbe, kronor och grenar, snöfall i
  skärmen. Inga blad; kören sitter i den vak som ligger närmast en strand. Snöboll i stället för
  kotte (samma kropp och etikett — samma regler), inga sköldpaddor, ankor eller fiskar.
- **Forsen:** `Flytvolym.stromX` (nytt i `lib/flytkraft.js`, standard 0): farten i sidled dras mot
  strömmen i proportion till nedsänkningen — grodan, korven och två stockar driver MOT KÖREN.
  6–8 stenar att hoppa mellan, inga blad, vågor som vandrar med strömmen, strimmor och skum vid
  stenarna. Laxar hoppar (fisk ×2 i hinderpoolen).
- **Skogen** (`_byggMark`, `_byggSvampar`): marken från kant till kant (typ `strand` — klibbig:
  tungan i marken DRAR grodan dit), en göl vid ena kanten där kören sitter (vattnet, flytvolymen
  och vassen bara där), stubben på marken, två extra träd mitt i världen, 3–4 flugsvampar
  (studs 0,8, envägs som grenarna). Fjärilar och humlor. Insekterna håller sig över marken
  (`golvY` 528).
- **Simhjälpen** (`_simHem`) söker nu alla landningsplatser (`landningar()`: blad, isflak,
  stenar), inte bara blad.

### 4h. Siktet och vändknappen — teknisk ritning (v1.260.0)

- **EN formel för farten:** `groda.superFart(p, aim)` ger utgångsfarten (px/steg) och läses av
  både `superHopp` och pilen (`index._siktBana`). Utan sikte samma vinkel som förut; med sikte
  samma fart åt fingrets håll. Hållet väljer kraften, fingret riktningen.
- **Banan räknas som matter räknar:** `v = v·(1 − LUFT_SUPER) + g` (g = gravity.y · scale · STEG2,
  plus vinden om den blåser), sedan `x += v`. Den slutar där grodan slår i något: fast mark provas i
  sju punkter runt tyngdpunkten (tyngdpunkten, fötterna `SIKT_FOT` 90 px under, sidorna ±40, ovanför),
  envägsblad/-grenar bara om fötterna en gång varit ovanför dem (spelets egen regel, `_envagsgrenar`),
  vattnet på väg ned. Det grodan står på räknas inte de första `LATT_STEG` stegen.
- **Två rättelser i hoppet för att banan skulle STÄMMA** (`scripts/_siktprobe.mjs` spelar in
  tyngdpunkten varje fysiksteg och jämför med pilens punkt k):
  ⓵ Superhoppets fartspärr klippte delarnas fart runt tyngdpunkten var för sig, och klippet läckte
  rörelsemängd ur hela hoppet (rakt upp: 52 px lägre topp än banan). Nu dras de klippta farternas
  massviktade medel av, så tyngdpunkten flyger en ren kastbana. Följd: full sats når 472 px högt och
  692 långt (var 382 och 779 — det gamla talet innehöll läckan), `_superhoppprobe`.
  ⓶ Fötterna skrapade i bladet de stod på de första stegen (−0,5 px/steg i x, −0,9 i y). Hoppet
  lyfter nu grodan `SUPER_LATT` 4 px, och underlaget släpper igenom grodan i `LATT_STEG` 8 steg
  (`_lattaSteg`).
- **Uppmätt efter rättelserna** (21 hopp, 3 slumpade dammar): fel längs banan 0–7 px i fri flygning
  (kontroll utan drag, brant, rakt upp: 0–3 px; landningen 0–80 px). Där det skiljer är det
  ragdollens ben som slår i en sten, stock eller ett grannblad nära frånskjutet — det är kaotiskt,
  och pilen stoppar då hellre vid hindret än flyger förbi det. Benen hänger 33–150 px under
  tyngdpunkten i luften (median 64–106), därav `SIKT_FOT` 90.
- **Vinkel:** `SIKT_MIN` 30°. Vid 20° skrapade benen i grannbladet efter 6 steg.
- **Vändknappen** (`_byggHud`, `_ritaHud`, `_vandTryck`): HUD-lagret (skärmrum), `VAND_KANT` 74 px in
  från vyns nedre högra hörn (med telefonens bleed). Går före grodan och tungan i `_tryck`. Kören kan
  i sällsynta kameralägen hamna under knappen — då vinner knappen, kören har 250 px träffyta kvar.
- **Sonden** `_siktprobe.mjs`: bana × 7 (kontroll utan drag + sex riktningar), kort drag = superhopp,
  kort tryck = vanligt hopp (180–190 px), vändknappen (vänder, ingen tunga, halon 55 px från mitten
  träffar, mitt i superhoppet ingen vändning), exit mitt i ett siktande drag — 0 konsolfel.

### 4b. Senare (inte i leverans 1)

- ~~[Medium] Slangbella-hopp (dra från grodan, prickad bana via `predictTrajectory`).~~ Byggt som
  sikte i superhoppet (v1.260.0, §4h) — dit fingret drar, inte bort från det.
- [Medium] Fler sällsynta händelser: regnskur (droppar som knuffar), näckrosblomma som öppnar
  sig, groda nummer två som tävlar om samma fluga (vänskapligt).
- [Deep] Bredare damm med `lib/kamera.js` (världsbredd 2400).

## 5. Status / loggar

`2026-09-23 · spec-kort godkänt, bygget beställt som nattpass · —`
`2026-09-24 · leverans 1 byggd: ragdoll, tunga, insekter, damm, hinder, finish; kritik åtgärdad; röstklipp; publicerad v1.254.0 · e68b8be`
`2026-09-24 · leverans 2: superhopp (sats → volt → stjärnläge → klibbrep → tumla → vakna → slurp) + grodkören som hem-knapp; 4 röstklipp; spelkritiker 6/6 (2 fynd åtgärdade); publicerad v1.255.0 · 38b6347`
`2026-09-24 · L3 bajsloopen (ägarens biom-önskemål, §0/§4d): full mage → bajskorv i kostens färger → tungan hämtar → bär → kasta till kören, tre matade = klar; vass-fällan rättad (2/6 → 6/6 loss); 9 röstklipp; spelkritiker 8/8 "klar att committa" (3 fynd åtgärdade); v1.257.0`
`2026-09-24 · L4 kamera + stor värld (2560 × 1440, §4f): två stränder med höga träd, stubbe, kör vid stranden med körpil, hem-bladet i HUD, klättra/hoppa ned, envägsgrenar/-blad, simtag; sex fällor stängda (§3 L4); v1.258.0 · e31b2c8`
`2026-09-24 · L5 biomer (§4g): damm · is (halt golv, vakar, snö) · fors (ström mot kören, stenar, skum) · skog (mark att dra sig längs, göl, flugsvampar); ny biom vid varje start; nästa korv efter 4; spelkritiker 8/8; test:all 86/86; v1.259.0`
`2026-09-24 · sikt-pil i superhoppet (dra fingret = riktning, pilen visar banan) + vändknapp nere till höger; fartspärren läckte rörelsemängd (rättad), grodan lättar ur underlaget; _siktprobe; v1.260.0`
