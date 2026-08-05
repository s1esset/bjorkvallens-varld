# Stor och Liten (`stor-liten`)
> 🧩 pussel · drag · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En mjuk äng. Uppe ligger flera exemplar av *samma* gulliga figur (t.ex. nallar) i tydligt olika
storlekar; nere står två korgar — en stor (blå, "Stor") och en liten (orange, "Liten"), var och
en med en genomskinlig "spök"-figur i exakt sin storlek som ledtråd (ingen läsning krävs) + en
liten textetikett. Jag tar en figur; den lyfts (popp-ljud) och skuggan växer (känns högre). Drar
jag den till rätt korg → glad röst ("Stor!"/"Liten!"), ljud, korgen studsar, ring + gnistor, och
figuren krymper ner i korgen. Fel korg → mjuk vingel + ring + ibland en vänlig "prova en annan
korg!" (aldrig en bestraffning). Alla sorterade → mild skakning + delat firande (stjärna +
klistermärke) och en ny, något större runda. Från nivå 5 dyker en tredje **mellan**-korg upp.
Ny figur-emoji varje runda (djur/frukt/fordon/leksak). Idle ~6s → instruktion upprepas + ett
föremål "andas".

**Funkar bra:** storleksskillnaden är tydlig och omedelbart läsbar, ledtråds-spöket i korgen är
en smart läsningsfri etikett, lyft-juicen är fin, no-fail intakt och tillväxten (2→3 korgar,
fler bitar) är mjuk. En ren, korrekt begreppslek.

*(Skärmdump: äng, "Stor"-korg + "Liten"-korg med spök-nallar, en liten nalle uppe till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodens intent: lära begreppen *stor/liten* (och senare *mellan*) genom att sortera samma sorts
gulliga föremål efter storlek i rätt korg. Bygger på DragController (stor träffyta, snäpp,
snäpp-tillbaka, tap-tap). Strikt felfritt, oändlig växande lek: fler föremål, ny figur varje
runda, en tredje korg på högre nivå. Storleken bär hela poängen — föremålen visas utan platta så
inget distraherar från storleksjämförelsen.

## 3. Vad gör det lättjefullt / tunt

- **Visuellt monotont — bara skala varierar.** Alla föremål i en runda är *samma* emoji i olika
  grad. Det är pedagogiskt rent, men öga och hand möter samma bild om och om; rundorna skiljer
  sig bara i vilken emoji som valts och hur många. Mekaniken är identisk varje gång man fattat den.
- **En-utfalls-sortering utan jämförelse-ögonblick.** Barnet *sorterar* stor/liten men *jämför*
  dem aldrig sida vid sida ("den här är större än den"). Begreppet är relativt, men spelet
  presenterar det som två fasta fack. Inget händer olika beroende på val — samma popp, samma ring.
- **Korgarna är passiva lådor.** De studsar men har ingen karaktär. En stor hungrig figur som
  vill ha *stora* saker och en liten som vill ha *små* skulle göra "rätt korg" till ett möte och
  knyta storleken till något levande.
- **Ljudet missar den enklaste multisensoriska vinsten.** Stort och litet låter *likadant*
  ('correct'/'match' + TTS-ord). En djup *bom* för stort och en hög *tink* för litet skulle koppla
  storlek → ljud direkt — gratis pedagogik.
- **Etiketten lutar mot läsning.** "Stor"/"Liten" i text är bra stöd men spöket (alpha 0.34) är
  den egentliga läsfria ledtråden och är ganska blek; en starkare visuell storleks-signal vore bättre.
- **Reward generisk.** Samma konfetti+stjärna som överallt; inget sorterings-specifikt slut.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Deep] Mottagar-figurer i stället för lådor.** En stor gosig figur (mamma-björn) som vill ha
  *stora* saker och en liten (bebis-björn) som vill ha *små* — "ge rätt storlek till rätt
  kompis". Samma mekanik, men nu finns ett *varför* och en publik som jublar proportionerligt.
- **[Medium] Jämförelse-moment.** Då och då en mini-variant: två föremål visas bredvid varandra
  och barnet pekar på "den största/minsta" — gör begreppet *relativt* (störst/minst), inte bara
  två fack.

### Variation & överraskning
- **[Quick] Blanda figurtyp mellan rundor tydligare** (redan emoji-rotation) + en sällsynt
  "jätte"-figur och en "pytte"-figur som ger extra-roliga reaktioner.
- **[Medium] Superlativ-runda** på högre nivå: störst/mellan/minst i en rad som ska ordnas — ett
  litet nytt grepp ovanpå samma koncept.

### Juice
- **[Quick] Storleksbunden SFX + studs.** Stor figur ner = djup *bom* + stor korg-studs + större
  skärmskak; liten = hög *tink* + liten studs. Reinforce stor/liten med örat.
- **[Quick] Korgen "sväljer" synligt** — den guppar tyngre för en stor sak, lättare för en liten.

### Progression
- **[Quick] Räkna upp korgens innehåll** med en liten siffer-/prick-rad (frö till antal) utan att
  bli ett poängsystem som sjunker.

### Karaktär & berättelse
- **[Medium] Bobo som domare** som håller upp "stor!"/"liten!" och blir glad — en återkommande
  vän som ger spelet röst och en egen vinst-animation.

### Ljud
- **[Quick] Variera berömfraserna + lägg lugn ambient** så loopen känns mindre upprepad.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan; ersätter äldre build-spec). Inga kodändringar.
  Testkörning ren (errorCount 0), skärmdump verifierad (två korgar med spök-figurer).
- Rekommenderad första-omgång: **[Quick] storleksbunden SFX/studs + [Deep/Medium] mottagar-
  figurer (stor & liten kompis)** — kopplar begreppet till ljud och ger sorteringen ett *varför*
  och en publik.
- 2026-07-01: **Första-omgång genomförd** — lådorna ersattes med **levande mottagar-kompisar**
  och sorteringen fick ljud + agens:
  - **[Deep] Mottagar-figurer i stället för lådor** (`_makeFriend`/`_buildFriends`): en stor
    gosig kompis (blå, stor kropp) vill ha *stora* saker och en liten (orange, liten kropp) vill
    ha *små*; på nivå ≥5 dyker en **mellan**-kompis (teal) upp → tre storlekar. Kroppsmåtten
    skalas efter storleken (`SIZES.bw/bh`) så "stor kompis = stor kropp" syns direkt. Varje
    kompis lever: långsam **andning** på önske-figuren + slumpvisa **blinkningar**
    (`_startFriendLife`/`_scheduleBlink`).
  - **Önske-ledtråd utan läsning** (`_ghost`): en genomskinlig figur i exakt den storlek
    kompisen vill ha ligger på magen — barnet ser *vad* och *hur stort* utan att läsa etiketten.
  - **[Quick] Storleksbunden SFX + "svälj"** (`_reactReceive` + `SIZES.tone`): rätt storlek →
    djup *bom* (stor), mellan-ton, eller hög *tink* (liten) via `audio.tone`, munnen öppnas,
    kroppen skvätter proportionellt (stor = tung squash + större skärmskak, liten = lätt), glada
    ögon. Kopplar begreppet stor/liten till örat.
  - **[Quick] Räkna upp innehållet** (`_dots`/`_fillNextDot`): en prickrad ovanför varje kompis
    fylls upp (frö → antal) allteftersom den får rätt saker — räknar bara UPP, sjunker aldrig,
    inget poängsystem.
  - Fel kompis = vänlig "nej tack"-vingel på både föremål och kompis + mjuk ring (aldrig
    bestraffning). Ny gullig emoji-figur varje runda (`EMOJIS`) → alltid ren storleks-uppgift.
    Fler föremål per runda + tredje kompis skalar svårigheten mjukt.
  - Test: `errorCount 0`; skärmdump bekräftar stor blå "Stor" + liten orange "Liten" med
    storleksmatchade spök-kakor på magen och prickräknare över huvudet.
  - **Deferred:** [Medium] jämförelse-/superlativ-runda (störst/minst i rad); [Quick] sällsynt
    "jätte"/"pytte"-figur; [Medium] Bobo som domare; [Quick] lugn ambient-loop (central ljud-
    hantering).
