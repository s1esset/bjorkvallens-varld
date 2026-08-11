# Pruttbubbelbad (`pruttbad`)
> 🎉 roligt · tap · 2–4 år · status: ✅ marknadsklar (2026-08-07)

> ⚠️ **Nuläget nedan beskriver spelet FÖRE omgången 2026-08-05** (orange boll, kalt badrum,
> emoji-anka). Läs §5 för vad som faktiskt gäller nu.

## 1. Nuläge (sett som spelare)

Ett porslinsbadkar fyllt med ljusblått vatten. "Zacke" sitter i badet och jag **trycker (eller
HÅLLER)** på hans mage → PRRRT! En luftbubbla föds vid tryckpunkten på karbotten, och om jag
håller kvar växer den synligt. När jag släpper stiger bubblan gungande genom vattnet (egen
ticker-integrator: sin-vobbel i sidled, terminalfart uppåt ∝ radie), studsar mot väggarna och
en **gul gummianka** 🦆 jag kan dra runt, och **POPPAR vid ytan** med ett fniss + skumplask +
gnistor. Varje pop ökar **skummet**, som fyller karet uppåt mot en prickad mållinje 🏁. En
stapel-mätare med ⭐ till höger visar hur full jag är. Skummet vid mållinjen → firande,
pruttsvärm, nytt och lite högre mål (oändlig lek).

Jag kan också trycka på **vattnet** (alltid en kul ring + knuff på närliggande bubblor) och
**dra ankan** (tap-tap glider den dit) för att studsa bubblor åt nya håll. No-fail är vattentätt:
tomma tryck finns inte (vatten ger plopp, magen ger alltid en bubbla), skummet växer monotont,
en anti-stuck-vakt poppar äldsta bubblan om skummet inte vuxit på ~4 s, och vid idle pruttar
Zacke själv tills badet fylls.

**Funkar bra:** håll-för-större-bubbla är fin direktmanipulation (ingen dold gest), bubbel-
fysiken är charmig och städningssäker (rena ticker-objekt, inga GSAP på bubblor), och ljud-
strypningen per nyckel (`_sound` med min-intervall) är ett genomtänkt skydd mot distorsion. Två
mållinjer/mätare gör framsteget tydligt utan läsning.

*(Skärmdump: badkar, "Zacke" som en orange boll med ansikte, gummianka, 🏁-mållinje, ⭐-mätare.)*

## 2. Ursprunglig plan & tankeprocess

Fnitter-fysik för de minsta: tryck → PRRRT → en bubbla som *lever* (stiger, vobblar, poppar) =
omedelbar orsak-verkan med kroppshumor som 2–4-åringar älskar. Håll-för-större lägger en
analog kontroll ovanpå tap:et (lite agens utan precision), och ankan ger en andra kontroll som
*kan* ändra bubblornas bana. Allt är no-fail med flera säkerhetsnät (idle-prutt, anti-stuck)
så badet alltid når mållinjen. Bubblorna hålls medvetet som rena ticker-objekt för exit-säkerhet.

## 3. Vad gör det lättjefullt / tunt

Mekaniskt sunt, men karaktären och en av kontrollerna är tunna:

- **"Zacke" är en faceless orange boll.** I bild (se skärmdumpen) är Zacke bara en orange cirkel
  med ögon och ett leende — inget huvud, ingt hår, inga armar, ingen kropp som badar. Den
  namngivna karaktären finns bara *i namnet*; visuellt är det en placeholder-blob. För ett spel
  som heter "Zacke sitter i badet" badar ingen igenkännbar Zacke.
- **Badrummet är kalt.** Karet är en enkel rundad rektangel. Ingen kakel-vägg, ingen kran, inga
  badleksaker utöver ankan, inget ångmoln, ingen tvål. Stora tomma blå ytor runtom.
- **Ankan saknar konsekvens.** Den är en söt leksak, men att flytta den påverkar nästan aldrig
  *om* badet fylls — skummet växer ändå (anti-stuck ser till det). Den lovade "andra kontrollen
  som ändrar utfallet" gör i praktiken ingen skillnad för målet; den är en konsekvenslös studsklots.
- **Bubblorna är likformiga.** Samma ljusblå cirkel med en glansprick. Ingen regnbågs-sheen,
  ingen bubbla-i-bubbla, ingen sällsynt jätte- eller glitterbubbla — varje pop ser likadan ut.
- **Skummet fyller en abstrakt nivå.** Vit klump + en stapel-mätare; tydligt men inte särskilt
  taktilt eller roligt (ingen skummande textur som bubblar, inget barn som försvinner i skummet).
- **Belöningen är generisk.** `bigCelebration` + PRAISE; pruttsvärmen är en fin krydda men det
  finns ingen egen bad-vinst (Zacke som plaskar jubel, skum-skägg, ankan som flyger).
- **Ljudet stiger inte.** `fart`/`plopp`/`pop`/`soft`/`boing` räcker, men det finns ingen
  klättrande tonhöjd när badet närmar sig fullt — inget crescendo mot mållinjen.

Kort sagt: *en charmig liten bubbel-simulator vars huvudperson och ena kontroll är platshållare* —
roligt att trycka, men Zacke och ankan bär ingen tyngd.

## 4. Förbättringar & förhöjningar (plan)

### Ägarens speltest 2026-08-11 — "ser okej ut, men…"
Rapporterat efter N3-tvålvattnet. Ägaren godkände stänket men pekade ut **perspektivet** som det
som förvirrar, och önskade fyra nya interaktioner. Punkterna nedan är hens ord, tolkade till plan.

- ~~**[Deep] Perspektivet går inte att läsa — är det uppifrån eller från sidan?**~~ ✅ 2026-08-11,
  se §5. Ägarens egna ord: *"vet inte i nuvarande läge om man ser badet uppifrån eller från
  sidan"*. Önskad form: **rent sidoperspektiv**, där karets sida mot kameran är **genomskinlig**
  (man ser vattnet, skummet och Zacke igenom den) medan **kanterna syns tydligt** och bär
  badkarets silhuett — fötter, rundad gavel, överkant.
  ⚠️ Vattenytan (`FluidView` + skummet) är byggd som en vågrät linje i sidled — kontrollera att en
  ny karform inte flyttar den, och ta skärmdump före/efter. *(Gjort: ytan ligger kvar på y=330,
  mätt i bild.)*
- ~~**[Medium] Propp att dra ut, kran att trycka på.**~~ ✅ 2026-08-11, se §5. En propp i botten
  som dras ut → vattnet **rinner ur** (nivån sjunker, virvel vid hålet, ljud). Kranen är redan
  ritad (droppar ner i badet sedan 2026-08-05) — gör den **tryckbar** så vattnet fylls på. Ger
  barnet kontroll över nivån i båda riktningar, vilket spelet i dag saknar helt.
  ⚠️ P0 MOTGÅNG: att tömma får aldrig nollställa framsteg — skummet/målet ska överleva en tömning.
  *(Gjort och mätt: skum 30 → 30 genom en full tömning OCH påfyllning.)*
- ~~**[Medium] Tre schampoflaskor i olika storlek → olika bubbelstorlek.**~~ ✅ 2026-08-11, se §5.
  Barnet **trycker själv på en flaska** för att hälla i bubbelmedel; liten flaska ger små bubblor,
  stor ger stora. Hyllan har redan en schampoflaska ritad — utöka till tre och gör dem till
  riktiga knappar (≥96 px träffyta). *(Gjort och mätt: 96 px ytor med 24/24 px luckor.)*
- ~~**[Deep] Badankan omfördelar vatten och bubblor.**~~ ✅ 2026-08-11, se §5. Flyttar man ankan
  ska **vattnet svara**: undanträngd volym, vågor som sprids, bubblor som skjuts undan och samlas
  där ankan inte är. ⚠️ Mönstret finns i `plask-i-vattnet` (undanträngd volym) — se
  `_plaskprobe.mjs`. *(⚠️ RÄTTELSE: det mönstret gick INTE att återanvända — den vätskan är
  SPH-partiklar i en `Flytvolym` som kräver en matter-värld, medan pruttbads bad är en RITAD
  form och dess bubblor rena ticker-objekt. Det som bar över var dess varning om bredden.
  Verktyget här blev ett 1D-höjdfält.)*
- **[Deep] Bättre vätske- och bubbelfysik generellt.** Ägarens ord: *"man kanske kan förbättra
  vätskefysiken och bubbelfysiken"*. Vagt med flit — mät först: kör `_vatskeprobe` och `_tvalprobe`
  och skriv ner VAD som ser fel ut i bild innan något ändras.

### Kärnloop & agens
- ~~**[Medium] Ge ankan (och fler badleksaker) verklig roll.**~~ ✅ 2026-07-01 (studs + bonus-skum)
  och 2026-08-05 (bonusen SYNS: gul puff i ankans färg, gnistor, stigande ton och ankan studsar
  till — kausaliteten "jag styrde bubblan hit, därför blev det mer skum" fanns förut bara i koden).
  Fler leksaker som styr bubblor är fortfarande ogjort.
- ~~**[Quick] Belöna att hålla.**~~ ✅ 2026-07-01. Giant-bubbla med regnbågs-sheen och dubbelt skum.
- **[Kritisk] ✅ 2026-08-05 — spelet spelade sig självt.** `_idleprobe 60` gav **4 klarade nivåer
  utan ett enda tryck**: auto-hjälpen födde en riktig bubbla var 6:e sekund och anti-stuck-vakten
  hällde in skum ur tomma intet var 4:e. Auto-hjälpen är nu en ren *inbjudan* (`_invite`) och
  vakten lossar bara barnets egna fastnade bubblor. Probe efter fixen: `idleFramsteg: 0`.

### Variation & överraskning
- ~~**[Quick] Bubbeltyper.**~~ ✅ 2026-07-01. Glitter- och jättebubbla. Tvillingbubbla är ogjord.
- ~~**[Medium] Gömda fynd i skummet.**~~ ✅ 2026-08-07 — **den här omgången.** En ritad
  badleksak (båt · stjärna · fisk · badboll · krabba, cyklar per nivå) ligger dold 35–80 % av
  vägen upp; när skummet stigit förbi den dyker den upp med gnistor och gungar kvar rundan ut.
  *(Originaltexten:)* **[Medium] Gömda fynd i skummet.** När skummet stiger kan en badleksak/anka/stjärna dyka upp
  ur det att trycka på — något att upptäcka utöver att bara fylla. *(Medvetet sparad 2026-08-05:
  skummet byggdes om helt i den omgången; fyndet blir billigt och säkert att lägga ovanpå nu.)*

### Juice
- ~~**[Quick] Stigande crescendo.**~~ ✅ 2026-07-01. Poppets tonhöjd klättrar 360→880 Hz med fyllnaden.
- ~~**[Quick] Skummande textur.**~~ ✅ 2026-08-05. Skum-ytan är en rad jäsande bubbeltoppar vars
  radier andas, plus mikrobubblor som stiger genom kroppen. Omritning strypt till ~12 fps.

### Progression
- ~~**[Quick] Mjuk tema-variation per nivå.**~~ ✅ 2026-08-07 — **den här omgången.** `BATHS`
  cyklar per nivå: bubbel (blått) → jordgubb (rosa) → blåbär (lila) → citron (gult) → mint
  (grönt). Vatten, vattentoning OCH skum byter färg samtidigt, och rundan säger sitt namn.
  *(Originaltexten:)* **[Quick] Mjuk tema-variation per nivå.** Byt badvattnets färg/skum-doft-tema (jordgubbsbad
  rosa, blåbärsbad lila) vid nytt mål, så rundorna känns olika. *(Kvar 2026-08-05 — kritikern
  påpekar att omgång 2 och 3 ser identiska ut bortsett från en högre mållinje. Detta är den enda
  punkten som håller `variation` och `mjuk progression` från att vara helt gröna, dvs. det som
  står mellan spelet och ✅.)*

### Karaktär & berättelse
- ~~**[Deep] Bygg en riktig Zacke.**~~ ✅ 2026-08-05. Ritad unge: huvud med vått tofsigt hår
  (kalotten följer skallen), öron, hals, kropp med navel, armar som plaskar vid varje prutt, och
  fyra riktiga miner — glad (vila), fniss (pop), wow (jättebubbla), jubel (fullt bad) — plus ett
  skum-skägg som dyker upp vid 78 % fyllnad. Han sitter numera *i* vattnet: kroppen ritas under
  vattentoningen, kar-kanten framför honom.
- ~~**[Quick] Kakel-badrum.**~~ ✅ 2026-08-05. Kakelvägg i förskjutna rader, golv, hylla med
  schampoflaska/tvål/leksaksbåt, handduk på stång och en kran som droppar ner i badet.

### Ljud
- **[Quick] Variera fart/pop-klippen + lugn vatten-ambient** (skvalp + droppande kran) för
  lugn och rikedom; behåll den befintliga ljud-strypningen.

## 5. Status / loggar

- 2026-08-11 🌊 **ANKAN OMFÖRDELAR VATTEN OCH BUBBLOR — ytan blev ett höjdfält** (v1.148.0).
  Ägarens §4-punkt 4. ⚠️ **Docens hänvisning till `plask-i-vattnet` gick inte att följa:** den
  vätskan är SPH-partiklar i en `Flytvolym` som kräver en matter-värld, medan pruttbads bad är
  en **ritad form** och dess bubblor rena ticker-objekt (med flit — exit-säkerhet utan extra
  skydd). Det som bar rakt över var dess *varning*: undanträngd volym höjer HELA ytan, så
  bredden ska hållas mindre än föremålet är ritat. Verktyget för en ritad yta blev i stället ett
  **1D-höjdfält** (41 stödpunkter tvärs karet, fjäder + grannspridning + dämpning, fast tidssteg).
  - **Undanträngd volym:** ankans nedsänkta del lyfter ytan — **mätt 8,2 px vid full
    nedtryckning**, och exakt tillbaka till 330,0 när hon släpps.
  - **Vågor:** vilo-dellen under henne är ~1,8 px, ett drag ger **12,5 px** och det klingar av
    till dellen igen. **Bubblor skjuts undan:** en bubbla 60 px vänster om ankan drev
    **−24 px (bort från henne)** mot **+63 px utan anka** — armarna växelvis, vobbelfasen nollad.
  - ⚠️ **TRE MODELLER, TVÅ MÄTT FELAKTIGA — det här är den dyraste lärdomen i omgången.**
    ⓵ *En impuls varje bildruta medan hon dras* är en KONSTANT KRAFT, inte en våg: dämpningen
    tar 2,8 % per steg, så jämvikten blir insatsen/0,028 ≈ 36×. Uppmätt: ett halvt sekunds drag
    pumpade fältet till sitt **tak (20,0 px)**. ⓶ *Att dra fältet mot ett måldjup vid hennes x*
    gör dellen till en energiKÄLLA som slåss mot fjädern för alltid — uppmätt **resthastighet
    0,367** fyra sekunder efter att allt slutat röra sig. ⓷ Rätt modell: dellen är fältets
    **VILOLÄGE**, `_wave` bär bara AVVIKELSEN (och kan därför gå till exakt noll), och vågor
    uppstår av att viloläget FLYTTAR SIG. Går inte att pumpa, och tar slut.
  - ⚠️ **Dämpningen måste ligga EFTER spridningen.** Låg den före blev spridningens eget bidrag
    odämpat, och för moden där varannan stödpunkt går upp och varannan ner är `l + r − 2h` lika
    med −4h: med två pass gav det styvhet 0,88 mot dämpning 0,972, alltså en nästan ostabil
    svängning vid Nyquist. Uppmätt resthastighet **0,087**. Nu ett pass, dämpning sist: **0,002**.
  - **Omritningen styrs av RÖRELSE, inte av utslag.** Vilo-dellen går aldrig tillbaka till noll
    så länge ankan flyter där — hade omritningen hängt på utslaget hade vattnet ritats om
    60 ggr/s för all framtid för en form som står still.
  - 🐞 **Två äldre buggar ramlade ut, båda i det gömda fyndet, båda funna av `_badprobe`:**
    ⓵ **Fyndet kunde placeras högre än skummet någonsin når.** Spannet mättes mot mållinjen,
    men kronan stannar `CROWN`=20 px under den — ett fynd över ~70 % av vägen kunde **aldrig**
    hittas. Buggen är äldre än sidovyn (gränsen låg på 71 % med den gamla mållinjen), alltså
    ungefär **var femte runda**. ⓶ **Armeringen hade ett hål:** den krävde att en bildruta
    OBSERVERADE skummet under fyndet, men en enda jättebubbla ger upp till 90 skum mot ett mål
    på 70 — hoppar skummet förbi i ett steg armeras det aldrig. Frågan är inte "har jag SETT
    skummet under fyndet?" utan "ligger det under NU, när jag placerar?". `_badprobe` gick från
    **2 av 4 röda till 8/8 fem körningar i rad**. Dess egen punkt 3 mätte också mot mållinjen
    och sa "39 %" om ett fynd som låg på 56 % — även den rättad.
  - **MÄTT** (`_perspektivprobe.mjs`, **26/26**) · `check` 0/0 · `test:all` **72/72** ·
    `_badprobe` **8/8 ×5** · `_idleprobe` **0** · 0 fynd i loggen.

- 2026-08-11 🧴 **TRE SCHAMPOFLASKOR — barnet väljer sorts bubblor** (v1.147.0).
  Ägarens §4-punkt 3. Hyllan bar en ritad schampoflaska som var ren dekor; nu står tre flaskor
  i olika storlek där och de är **riktiga knappar**. Ett tryck lutar flaskan, häller en stråle
  bubbelmedel ner i badet, säger vad man valde och lyfter flaskan med en ring runt sig.
  - **liten** 17–32 px, och **tre bubblor per tryck** · **mellan** 28–70 (spelets gamla
    beteende) · **stor** 46–96. Tak 100 px oavsett flaska och nivå.
  - ⚠️ **`antal` finns för att valet inte ska vara ett sämre och ett bättre alternativ.** Skum
    per popp växer med radien, så den stora flaskan hade annars varit strikt bäst och de två
    andra bara långsammare vägar till samma sak. Små bubblor kommer dessutom i klunga i
    verkligheten — tre små per tryck är både den ärliga läsningen av "små bubblor" och det som
    gör flaskorna till tre SORTER i stället för tre nivåer av samma.
  - ⚠️ **Nivåbonusen ligger bara på MAXET, inte på startstorleken.** `_levelBoost` går upp till
    +20 px, och lagd på den lilla flaskans 17 hade den gjort små bubblor större än
    mellanflaskans egen startstorlek — då är tre flaskor inte tre sorter längre. Bonusen skalas
    dessutom med flaskan. **Mätt vid högsta bonus: 17–41 · 28–90 · 46–100**, alltså håller
    skillnaden hela vägen upp.
  - 🐞 **P0-brott som såg ut som generositet, fångat av mätningen:** träffytorna var först
    **104 px breda** med 120 px mellan mittpunkterna — vilket ger **16 px lucka**, under P0:s
    krav på 24. En för STOR träffyta bröt alltså regeln. 96 + 24 = 120 går exakt ihop.
    **Mätt ur de levande `hitArea`-objekten: 96 px ytor, luckor 24/24.**
  - Tvålen flyttade ner till kar-kanten och leksaksbåten togs bort: hyllan är interaktiv nu, och
    inerta prylar mellan tre knappar lär bara barnet att trycka på fel sak.
  - ⚠️ **Sonden krävde först helt skilda spann** och blev röd på att den lilla flaskans HÅLL-max
    (32) ligger över mellanflaskans TAP-start (28). Det är inget fel — att hålla är belöningen
    och banden får tangera i kanterna. Kontrollen mäter nu det som faktiskt påstås.
  - **MÄTT** (`_perspektivprobe.mjs`, **23/23**) · `check` 0/0 · `test:all` **72/72** ·
    `_badprobe` 8/8 · `_idleprobe` 0 · `_tystprobe` oförändrat 6 · 3 nya röstklipp (0 failed).

- 2026-08-11 🚿 **PROPP OCH KRAN — barnet styr nivån i båda riktningar** (v1.146.0).
  Ägarens §4-punkt 2. **Vattenytan var en KONSTANT som allt annat byggdes kring** (`SURFACE_Y`
  på 30 ställen), så hela poängen med punkten låg i att göra den till ett levande värde.
  - **Proppen** (röd, med mässingsring) sitter i ett avloppshål i karbottnen. Ett tryck drar
    ur den → den lägger sig lutad bredvid hålet, en virvel snurrar över hålet och vattnet
    rinner. Ett tryck till sätter tillbaka den. **Kranen** har fått en träffyta (148×112 px)
    och en knopp som vrider sig; ett tryck ger en stråle ur pipen ner i badet.
  - ⚠️ **DE TVÅ KONTROLLERNA FÅR ALDRIG SLÅSS.** Att låta kranen fylla medan proppen är ur
    ger ett dragkampsläge där nivån knappt rör sig — för ett barn som inte kan läsa är det
    bara två knappar som inte funkar. Ett kranpådrag **sätter därför tillbaka proppen**,
    synligt och med ljud. Kvar blir en regel som går att lära sig på en runda.
    Fyllnadstakten är dessutom snabbare än tömningen med flit (86 mot 44 px/s).
  - ⚠️ **P0 MOTGÅNG, mätt:** `_foam.level` och `_goalFoam` rörs inte av en tömning —
    **skum 30 → 30** genom en full tömning och påfyllning. Skummet ÅKER MED nivån ner och
    tillbaka upp (det är ju vad skum gör), och tömningen har ett **TAK** på y=468, så badet
    kan aldrig bli tomt och bubblorna har alltid någonstans att poppa. Mållinjen hänger i
    ytan och sjunker med den, annars gick rundan inte att klara med ett halvfullt bad.
  - **Så gjordes refaktorn säker:** modulkonstanten `SURFACE_Y` **togs bort helt** i stället
    för att lämnas kvar bredvid det levande värdet. Varje metod som rör vattnet tar
    `const SURFACE_Y = this._surf` som första rad — en glömd rad blir då ett ReferenceError
    som testet fångar, i stället för vatten som tyst ritas på fel höjd.
  - Vattnet flyttades till en **egen Graphics**: nivån rör sig varje bildruta, och att rita om
    fötter, skal, bakvägg och skuggor 60 ggr/s för att flytta EN kant vore att betala hela
    karet för vattnets skull.
  - ⚠️ **Fyndlagret FLYTTAS, fyndets y skrivs inte om** — dess gungning är en `repeat:-1`-tween
    som skriver `.y` på vyn, och två skrivare på samma värde slåss. `_checkTreasure` räknar
    därför i lagrets egen ram; annars hade en TÖMNING "hittat" fyndet i stället för skummet.
  - ⚠️ **Tvålbandet är ett FÖNSTER kring ytan** och skjuts med den. Bandets HÖJD får inte
    ändras — `FluidWorld` dimensionerar sitt rutnät ur den vid konstruktionen.
  - ⚠️ **En svart gummipropp försvinner i djupt vatten.** Första formen var mörkgrå mot badets
    mörkaste parti; en kontroll ett barn inte hittar är ingen kontroll. Och en urdragen propp
    ska **ligga, inte sväva** — första läget lyfte den 62 px rakt upp i vattnet där ingenting
    håller den, vilket lästes som ett flytande föremål snarare än som "proppen är ur".
  - **MÄTT** (`scripts/_perspektivprobe.mjs`, utökad — **20/20 gröna**): ytan 330 → 454 när
    proppen dras · allt följer med (anka 314→438 · mållinje 264→384 · tvålband 220→344 ·
    vatten-träffyta 330→454 · fyndlager +124) · tömningen bottnar på **468** · kranen sätter
    tillbaka proppen · ytan 468 → 330 igen · **58 fps medan vatten, toning, skum och mållinje
    ritas om varje bildruta** · 0 konsolfel vid exit.
  - ⚠️ **Sonden fällde sig själv först:** kontrollerna före poppar bubblor, och bubblor ger
    skum — blocket ärvde **415 skum mot ett mål på 70**, alltså hade rundan redan klarats när
    proppen skulle testas (och `_togglePlug` avvisar under firandet). Fyra röda som alla var
    mätfel. Blocket startar nu om spelet först.
  - `check` 0 fel/0 varningar · `test:all` **72/72** · `_badprobe` **8/8** · `_idleprobe` **0** ·
    `_tystprobe` oförändrat 6 kandidater i repot · 3 nya röstklipp genererade (0 failed).

- 2026-08-11 🛁 **RENT SIDOPERSPEKTIV — ägarens §4-punkt, tagen först** (v1.145.0).
  Frågan "uppifrån eller från sidan?" gick att göra mätbar så fort man skrev ner VAD i bilden
  som bär vilken läsning. Scenen bar **tre toppvy-signaler och nästan inga sidovy-signaler**:
  1. **Karet täckte sina egna fötter.** Kroppen gick till y 680, fötterna satt 596–670 och
     ritades FÖRE den — bara 10 px nubbar stack ut i sidled. Karet gick dessutom ner **genom**
     golvlinjen (622). Ingenting sa att det stod i ett rum.
  2. **Ankan flöt 100 px UNDER ytan** och kunde dras fritt i hela vattenfältet (y 350–584).
     En anka som svävar stilla mitt i vattnet har ingen annan läsning än en skål sedd uppifrån.
     Det här var den starkaste av de tre — och den satt i **spelbarheten**, inte i grafiken.
  3. **Vattnet fyllde en rundad rektangel** ända ut i alla fyra hörn med kanten runt om.
  **Byggt:** karet står på golvet på synliga fötter i en kontaktskugga (golvlinjen 622 → 640,
  karets botten 680 → 624), insidan smalnar av nedåt (`tubPath` — allt som ligger i karet ritas
  mot samma kontur), ankan flyter i ytan och kan **tryckas ner** med lyftkraft som bär upp
  henne igen, ytlinjen är en riktig yta i stället för en linje på alpha 0,3, och framsidan mot
  kameran har **ingen fyllning alls** — bara sin kant och sin glans, precis som ägaren bad om.
  - **Zacke fick ben.** En genomskinlig framsida är värd noll om det inte finns något att se
    igenom den: de nedersta 190 px av badet var ett tomt blått fält. Han står nu på karbottnen
    med vattnet i brösthöjd.
  - ⚠️ **Två fel som BILDEN hittade och talen aldrig hade sett:** ⓵ benen svängde först ut i
    knäna och tillbaka in mot fötterna, så de två benen slöt ihop till en **ring** som lästes
    som en grå badring runt magen; ⓶ ritade knä-cirklar lästes som **leder på en docka**.
    Båda gick bort genom att lita på formen i stället för att lägga till detaljer.
  - ⚠️ **Att RITA fötterna räckte inte — de bar golvets egen baston.** `0xdfe7ea` mot ett golv
    byggt på `0xdfe7ea`: uppmätt skilde bara **14 av 30 rader** i fotens kolumn mer än tröskeln
    från golvet bredvid, alltså låg den starkaste sidovy-signalen och var osynlig. En platt
    mörkare ton räckte inte heller (**21**, fortfarande under tröskeln — karets egen skugga
    mörkar ju golvet till nästan exakt fotens ton). Först volym (ljus upptill, skugga nedtill)
    gav **30 av 30**. Samma D1-lärdom som golvet och karinsidan redan fått.
  - 🐞 **Bugg som ramlade ut på vägen: mållinjen var DOLD från nivå 2 och uppåt.** `_goalY`
    bottnade på 248 — mitt i kar-kantens 13 px-stroke, som ritas efter den. Måldottarna fanns
    alltså inte i bild i någon runda utom de två första. Taket ligger nu på 264 (`GOAL_MIN`),
    under rullkanten, och målflaggan flyttades framför kanten (den skars annars av på mitten).
    **Mätt i bild: 127 px mållinje-teal längs y=264 på nivå 8.**
  - **MÄTT** (`scripts/_perspektivprobe.mjs`, ny — **12/12 gröna**): ytan ligger kvar på
    **y=330** · golvet syns under karet (avstånd **0** mot golvet utanför) · fotens kolumn
    **30/30** rader skiljer sig från golvet bredvid, nollpunkt golv-mot-golv **0** ·
    vattnet följer den lutande väggen (x=1070 är porslin, x=1000 vatten) · ankans vilo-y
    **314** och tak **390** (gamla fältet gick till 584) · hon far upp till **314** efter
    släpp · bubblor föds innanför insidan · 0 konsolfel vid exit mitt i ett nertryck.
  - **Balans, A/B mot HEAD:** vattenpelaren blev kortare, så en bubblas resa gick
    **1 712 → 1 441 ms (−16 %)**, median av tre. Skummet per popp är ORÖRT (samma `r`, samma
    `FOAM_K`) — det är alltså väntetiden till belöningen som kortades, inte svårigheten.
    ⚠️ **Första mätningen var konfunderad och sa −1 %:** mätbubblan låg på x=700, och där låg
    HEADs anka (780, 430) mitt i vägen och **sparkade upp** den. x=350 är fri i båda lägena.
  - **Platthet, samma fält före/efter:** `#e4f4fa` 68 647 → 69 478 (inom bruset som redan är
    dokumenterat för det fältet), teal 24 604 → 27 333, och **total platt yta 737 674 →
    670 019 px (−9 %)**.
  - `check` 0 fel/0 varningar · `test:all` **72/72** · `_badprobe` **8/8** · `_idleprobe` **0**
    (spelet spelar fortfarande inte sig självt) · 0 fynd i `.test-logs/pruttbad.json`.

- 2026-08-10 💧 **NATTKÖ N3 / LYFTPLAN B1: riktigt tvålvatten vid poppet** (v1.133.0).
  Ett popp kastade förut bara en generisk `puff`. Nu flyger **SPH-droppar** (`FLUIDS.tval`,
  `lib/vatska.js`) upp ur ytan, hänger ihop av yttensionen och faller tillbaka.
  **Simulerat bara där vätskan syns:** ett smalt band kring vattenytan, och droppar som faller
  tillbaka **dräneras** bort (under ytan ligger vattnets alfa över dem — de vore osynliga men
  hade kostat varje steg för alltid). Partikeltak 120; är budgeten slut hoppas stänket över.
  - **MÄTT** (`scripts/_tvalprobe.mjs`, 10 kontroller gröna, CPU ×6): **2 024 px netto** målade
    ovanför ytlinjen, 20 av 20 partiklar över ytan, dränerade till **0** efteråt, **60,6 fps**.
  - ⚠️ **Fyra fel som talen först dolde — tre av dem hittades av bilden:**
    1. **Osynlig vätska.** `radius: 13` + `threshold: 0.36` gav **−544 px netto**. En gles
       solfjäder av 8 droppar ligger utanför varandras interaktionsradie, och en ensam partikel
       når aldrig metaboll-tröskeln. → radie **20**, tröskel **0,26**, fler droppar.
    2. **Tryckskott.** `splash` föder alla partiklar inom ±jitter/2, så `jitter: 5` gjorde 20
       partiklar till en densitetsspik som `kNear` sprängde **~180 px uppåt** — ut ur karet, upp
       på tvålhyllan. → jitter = bubblans bredd, och `walls.top` som riktig vägg.
    3. **Vita droppar på vitt skum.** Första färgsättningen använde rundans SKUMfärg, och
       `BATHS[0].foam` är `0xffffff`. → tvålens kropp = badets **vatten** draget 45 % mot vitt.
    4. **Ordningsbugg.** `init` anropar `_applyLevel` **före** `_buildTval`, så färgsättningen
       no-oppade och dropparna behöll `FLUIDS.tval`-blå ända till andra rundan — ljusblå tvål i
       ett rosa jordgubbsbad. → `_tintTval()` anropas nu också i `_buildTval`.
  - ⚠️ **`_vatskeprobe` duger inte här** och rapporterade grönt om ingenting: den mäter en
    vätska som rinner av sig själv, men den här föds bara av ett POPP. Den gav `partiklar: 0`
    hela körningen och ändå 232 913 "vätskepixlar" — badvattnets blå ligger nära `FLUIDS.tval`.
- 2026-08-10 🎨 **D1: badkarets insida fick ljus** (`fb7d4bd`, v1.125.0).
  Kärinsidan låg på **56 535 px i EN ton** — spelets största fält sedan golvet tonades. Dämpad
  ramp; toningen mörknar nedåt, vilket också är rätt för en kärinsida (ljuset kommer uppifrån,
  botten ligger i skugga). Fältet `#daeaf3` är ute ur topp-3.
  ⚠️ **Spelets TOPPTAL steg (56 535 → 68 757) och det är INTE en regression.** Badvattnets
  `#e4f4fa` tog över platsen, och det fältet varierar kraftigt mellan körningar eftersom
  vattennivån stiger under spelets gång — uppmätt till **29 953 / 45 767 / 54 871 / 68 757 i
  fyra körningar UTAN kodändring**. Jämför samma FÄLT, inte samma tal.

- 2026-08-10 🎨 **D1: badrumsgolvet fick ljus** (`745ff36`, v1.124.0).
  Golvet låg på **61 880 px i EN ton** — spelets största fält. Dämpad ramp (0,06/0,10): ytan är
  nästan vit och standardvärdena hade gjort den smutsgrå.
  **MÄTT:** fältet `#dfe7ea` är ute ur topp-3. Spelets topptal rörde sig 61 880 → 56 535,
  eftersom badvattnet tog över platsen — fyndet flyttar ett lager in. Badvattnet är nästa mål här.

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`e65b2ef`, v1.109.0).
  `_plattprobe --medbakgrund` mätte **270 576 px = 29 % av skärmen** i EN ton.
  Vatten är ljusare vid ytan och mörknar nedåt, men den vanliga fixen gick INTE att
  använda: vattnet ritas med `alpha` (Zacke och ankan ska synas nedsänkta). **Lösningen ligger
  i gradientens STOPP** — `addColorStop` kör dem genom `Color.toHexa()`, så '#rrggbbaa' är
  ett giltigt färgstopp och toningen kan bära genomskinligheten själv. Verifierat i bild:
  magen syns fortfarande igenom. Tekniken flyttades sedan till `lib/form.js` som
  `verticalFillAlpha` (`7cfdd87`) och spelet bytte till den delade hjälparen.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **270 576 → 61 880 px** (29 % → 6,7 %).

- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0). Inga kodändringar ännu. (Ersatte den
  äldre bygg-specen i samma fil med review-format enligt mallen.)
- Rekommenderad första-omgång: **[Deep] bygg en riktig Zacke + [Medium] ge ankan roll** —
  åtgärdar de två tydligaste svagheterna (platshållar-karaktär och konsekvenslös kontroll).
- 2026-07-01 🔧 **Första-omgången byggd (scoped):** (1) **Ankan fick en roll [Medium]** — en bubbla
  som studsar på ankan sparkas upp (`vy -= 3`) och märks `duckBoost` → bonus-skum vid pop, så
  ankans placering nu påverkar utfallet. (2) **Bubbeltyper + belöna-håll [Quick]** — en hålld/stor
  bubbla blir en `giant` (regnbågs-sheen, **dubbelt skum**); ~10 % blir `glitter` (poppar till ✨,
  1.5× skum) via `_makeBubbleView(kind)`. (3) **Stigande crescendo [Quick]** — poppet klättrar i
  tonhöjd (`audio.tone`, 360→880 Hz) ju fullare badet är. Städning: oanvänd `ctx`-param bort ur
  `_newRound`. Den fulla Zacke-figuren (Deep) + skum-textur lämnade till senare. errorCount 0.
- 2026-08-05 🔧 **Andra omgången (poleringsrundan, Kö 1 #5).** Commit `feat(pruttbad): …`.

  **Kritisk agens-bugg — spelet spelade sig självt.** `node scripts/_idleprobe.mjs pruttbad 60`
  gav `idleFramsteg: 4`: badet fylldes och firade **fyra gånger på en minut utan ett enda tryck**.
  Två samverkande gratis-skum-kranar: `_autoHelp` födde en riktig bubbla var 6:e sekund, och
  anti-stuck-vakten anropade `_addFoam(R_MIN)` var 4:e sekund när inga bubblor fanns. Fixat:
  `_autoHelp` → `_invite()` som bara *bjuder in* (prutt-ljud, min-byte, armplask, ren FX-puff,
  repeterad röst, pekande hand första gången) och aldrig rör `_spawnBubble`/`_addFoam`; vakten
  kör bara när `_bubbles.length > 0` och poppar då barnets egen äldsta bubbla. Efter fixen:
  `idleFramsteg: 0`, `efterSpel: 1`. **No-fail betyder att inget straffar barnet — inte att
  badet fyller sig självt.**

  **Ritad Zacke [Deep] + kaklat badrum [Quick] + skum-textur [Quick]** enligt §4 ovan.

  **P0 ASSETS — noll emoji-spelobjekt kvar.** `🦆` (som dessutom renderades som en **gräsand** —
  grönt huvud, brun bringa, alltså inte alls den gula badanka spelet lovar), `🏁` och `⭐` är nu
  ritade. `✨`-floatTexten ersatt av `sparkle()`; utropen är rena svenska ord.

  **Tre buggar hittade på vägen:**
  1. *Sjätte läckan igen* — giant-bubblans regnbågsbågar använde `g.arc()` efter en `.stroke()`
     i samma `Graphics` ⇒ ett streck drogs från föregående form in i varje båge. Lokal
     `arcPath()`-hjälpare införd och använd överallt (även i ansiktets bågar).
  2. *Skummet såg fullt ut innan det var klart.* `_goalY` bottnade på 220 medan `_goalFoam`
     fortsatte växa (+18/nivå), så från nivå 3 nådde skummet mållinjen visuellt långt före
     målet. Skummet ritas nu i **andel** av vägen till linjen, och bubbeltopparnas överskjut
     (`CROWN = 20`) dras av så att kronan och mätaren når linjen exakt samtidigt.
  3. *check.mjs var RÖD på master* — `voiceIntro` saknade rad i `scripts/voice-phrases.json` och
     kunde alltså aldrig få ett klipp. Tillagd via `_addphrases`.

  **Efter kritiken:** armarnas kontur byttes från den ljusa `SKIN_DARK` till kroppens `SKIN_OUT`
  (armarna smälte ihop med torson till en blek klump under vattentoningen), och anka-boosten fick
  en egen florish. `check` grön · `test` 0 fel · `idleprobe` 0.

  **Kvar (medvetet):** tema-variation per nivå [Quick] och gömda fynd i skummet [Medium] — båda
  bygger på skummet som byggdes om här. Vatten-ambient [Quick] väntar på att SFX-pipelinen är
  uppe. Spelet står kvar som **🔧** just därför: kritikern bedömer `variation` och
  `mjuk progression` som endast *delvis* uppfyllda så länge rundorna ser identiska ut.
- 2026-08-07 ✅ **Poleringsomgång: rundorna ser inte längre likadana ut.** Spelet hade INGA
  öppna [Deep]-punkter — dess 🔧 var ett **kvalitetsomdöme** från `spelkritiker` (variation och
  mjuk progression endast delvis uppfyllda "så länge rundorna ser identiska ut"). Omgången
  riktade sig rakt mot det omdömet.
  1. **Badsort per runda** (`BATHS`): bubbel → jordgubb → blåbär → citron → mint. Vatten,
     vattentoning och skum byter färg, och `_newRound` säger badets namn — skillnaden syns på
     en halv sekund och hörs även för den som inte tittar.
  2. **Gömt fynd i skummet:** en ritad badleksak (båt/stjärna/fisk/badboll/krabba, cyklar per
     nivå) ligger dold 35–80 % upp. Skummet stiger förbi → gnistor, `reveal`-ton, replik, och
     den gungar kvar rundan ut. Något nytt att upptäcka varje runda.
  - **Skärmdumpen avslöjade en bugg inget test såg:** rosa skum över blått vatten under hela
    firandet. `_level` ökar i samma stund rundan klaras, men karet målas om först 1,5 s senare
    i `_newRound` — och skummet läste nivån *live*. Badsorten ligger nu i `_bathNow`, satt på
    ett enda ställe (`_applyLevel`), så allt byter samtidigt.
  - **Blockerare från `spelkritiker`, åtgärdad:** nästa rundas fynd avslöjade sig självt direkt
    i **3 fall av 4**. `_onComplete` pumpar in en pruttsvärm som driver `_foam.level` långt förbi
    målet (mätt 350–450 mot ett nytt mål på 88), och `_newRound` placerar det nya fyndet innan
    drän-tweenen hunnit tömma skummet — leksaken gungade synligt i ett tomt kar. Fyndet måste nu
    **armeras**: skummet ska först ha setts UNDER det. Det är oberoende av tajmingen mellan
    `_resolving`, tweens och nivåbytet, till skillnad från en ren `_resolving`-spärr.
  - **Min sond missade det helt** — den testade bara via `setLevel` + sidladdning, alltså
    alltid via `init()` där `_foam.level` är 0, aldrig en **levande** vinst → ny runda. Den
    mäter nu övergången; 8/8 tre körningar i rad på precis det fall som föll 3 av 4.
  - Fyndets x-spann hoppar över ett band kring Zacke (annars ritades leksaken ovanpå honom i
    ungefär var femte runda).
  - **Exit-säkerhet:** spelet hade ingen `_tweens`-lista. Fyndets gungning är `repeat: -1` och
    skriver `.y` på vyn — den dödas nu både vid nivåbyte (före vyn rivs) och i `destroy`.
  - **Mätt:** `scripts/_badprobe.mjs` **8/8** ×3 · `npm run check` 0/0 · `npm run test:all`
    **71/71** · 0 fynd i `.test-logs/pruttbad.json`. **Kvalitet 🔧 → ✅.**
  - Kvar som [Quick] i §4: variera pop-klippen + lugn vatten-ambient (väntar på SFX-pipelinen).
