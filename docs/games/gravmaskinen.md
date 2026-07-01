# Grävmaskinen (`gravmaskinen`)
> ⚙️ fysik · drag · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En varm bygg-/sandscen. Till vänster en stor sandhög där **Zacke** sitter i en grön
grävmaskin med gul hytt; en metallskopa hänger i en brun bom. Till höger ett lastbils-flak
(bruna väggar + golv) med en gul streckad **fyllnadslinje** och en 🎯-markör, och under det
en liten 🚛-lastbil. Jag **drar skopan** ner i sandhögen → skopan fylls (sandnivån i skopan
stiger), drar den fyllda skopan över flaket och **släpper** → skopan tippar och **kornig
sand rinner ut** vid munnen. Sanden faller *granulärt* (en egen cellulär falling-sand-sim,
inte matter.js) och lägger sig i högar i flaket. Fyll till linjen → lastbilen guppar och
tutar ("Tuut tuut!"), firande, stjärna + klistermärke, och en ny, större last.

Spelet kan aldrig misslyckas: sandhögen är oändlig, spilld sand utanför flaket ger bara en
😄 + puff, och en mjuk auto-hjälp (vindpust 💨 + extra sand + linjen sänks lite) garanterar
att flaket alltid blir fullt. Tap-tap-fallback finns: tap vid högen fyller skopan halvvägs,
tap över flaket flyttar dit + tippar. Idle ~6 s ger röst-recue + en ⬇️-vink mot högen.

**Funkar bra:** den riktiga kornsimuleringen är spelets stjärna — sand som rinner, rasar och
lägger sig i naturliga högar är taktilt och fascinerande, och helt exit-säkert (rutnät, inga
GSAP-tweens på korn). Gräv-medan-du-drar + tippa-vid-släpp är en härligt fysisk loop, Zacke
ger scenen ett ansikte, och spill-som-kul är perfekt no-fail. Karaktärsfull stillbild.

*(Skärmdump: sandhög med skopa till vänster, Zacke i grön grävmaskin, tomt flak med gul
fyllnadslinje + 🎯 till höger, liten lastbil under, varm sandbakgrund.)*

## 2. Ursprunglig plan & tankeprocess

Designintentionen (ur kodhuvudet) var en **bygg-/fysiklek byggd kring en äkta falling-sand-
simulering** — den taktila "gräv och häll riktig sand"-fantasin som småbarn älskar i
sandlådan. Det kännbara fröet är orsak-verkan + grovmotorik: dra ner, fyll, sväng, tippa,
se sanden rinna. Sim:en kördes medvetet på ett eget Int8Array-rutnät (CELL=10, fast STEP_MS)
i stället för matter.js, både för prestanda (alla korn i en Graphics per frame) och för att
sand-rasande beteende är svårt med stela kroppar. No-fail bärs av oändlig hög + roligt spill
+ auto-vindpust. Fyllnadslinjen + 🎯 ger ett tydligt, läsbart mål; Zacke (enda avbildade
människan) ger föraren ett ansikte.

## 3. Vad gör det lättjefullt / tunt

Stark, karaktärsfull kärna, men flera tunna drag:

- **Sanden är enfärgad och utan partikel-liv.** Kornen ritas i tre nyanser efter cell-värde
  men allt är samma beige sand. Ingen grus/guld-ådra, inga stenar, inga skatter att gräva
  fram, ingen färgvariation att upptäcka. Att gräva ger alltid exakt samma sand.
- **Bommen är en stel pinne.** `_drawBoom` ritar en rak linje från en fast pivot till
  skopan — den böjs inte, har inga leder, ingen hydraulik-känsla. Skopan glider fritt i 2D
  utan att armen begränsar räckvidden trovärdigt; det ser mer ut som en svävande skopa än
  en grävarm.
- **Lastbilen är passiv rekvisita.** 🚛-emojin står still tills finalen, då den guppar. Den
  kör inte fram, väntar inte, har ingen förare som vinkar. Flaket är en abstrakt brun låda
  *bredvid* lastbilen snarare än *på* den — kopplingen flak↔lastbil är otydlig.
- **Tippandet är samma gest varje gång.** Dra-släpp över flaket → skopan lutar 0.7 rad och
  sanden faller. Ingen variation i hur man häller (snabbt/långsamt, hög/låg), ingen
  precision som belönas — bara "släpp ovanför flaket".
- **Auto-hjälpen fyller flaket åt mig.** Efter 4 tippningar eller 12 s utan full last sopas
  26 extra korn in (`_autoPour`) *och* `_target` sänks med 8. Ett barn som bara drar runt
  får flaket fullt av magi; den egentliga "gräv tillräckligt"-utmaningen kan kringgås helt.
- **Tap-tap-fallbacken "fuskar" fram sand.** Tap vid högen sätter `_bucketCount = max(…, 24)`
  rakt av — skopan blir halvfull utan att ha rört högen. Funktionellt men bryter illusionen
  av att gräva.
- **Ljudet är tunt.** Gräv = `soft`, tipp = `whoosh`, spill = `soft`, full = `correct`+
  `celebrate`. Inget kornigt sand-rassel som rinner, inget skrap av skopan i högen, ingen
  motor-/hydraulik-ljud från grävmaskinen. "Full last! Tuut tuut!" är TTS, inte en riktig tuta.
- **Tomt mellanrum.** Stora delar av scenen (mitten, ovanför) är tom varm bakgrund —
  ingen byggarbetsplats, inga koner, ingen kompis-maskin, inga skyltar.

Kort sagt: simuleringen är fantastisk, men **sanden är enfärgad, bom/lastbil är stela
rekvisita, och auto-hjälp + tap-fusk kan kringgå själva grävandet**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Belöna *hur* man gräver/häller.** Låt djupare/längre svep i högen fylla skopan
  mer, och låt en lugn, riktad häll lägga sanden snyggare än ett slarvigt släpp. Då blir
  drag-gesten en skicklighet, inte en på/av-knapp.
- **[Medium] Mjuka upp auto-hjälpen.** Låt vindpusten bara ge en sista liten knuff när
  flaket är *nästan* fullt efter lång idle, i stället för att sänka `_target` och sopa in 26
  korn — så barnets egna grävtag bär lasten.
- **[Quick] Ta bort tap-fusket från illusionen.** Låt tap-vid-hög *animera* skopan ner i
  högen och fylla den medan munnen är i sanden (återanvänd `_inPile`-logiken) i stället för
  att sätta `_bucketCount` rakt av.

### Variation & överraskning
- **[Quick] Färgad/varierad sand & fynd.** Lager av olika sandfärger, enstaka glittrande
  guldkorn, och ibland en begravd skatt (🦴/💎/snäcka) som dyker upp när man gräver djupt och
  firas extra — ger en anledning att gräva mer.
- **[Medium] Olika laster per nivå:** grus, småsten, snö, godis-strössel — varje med lite
  olika rasvinkel/färg, så nivå 3 inte bara har "mer sand".
- **[Quick] Befolka bygget:** trafikkoner, en skylt, en kompis-maskin (hjullastare), en
  liten fågel på sandhögen — fyll det tomma mittfältet.

### Juice
- **[Quick] Kornigt sand-ljud** ([[real-audio-sfx]]): ett rinnande sand-rassel medan korn
  faller (intensitet ∝ antal rörliga korn), ett skrap när skopan gräver, en riktig
  lastbils-tuta vid full last — ersätt `soft`/TTS.
- **[Quick] Damm & skak.** Dammpuff när sanden landar i flaket, ett litet skärm-skutt när en
  stor mängd rasar, och en kort skopa-darrning vid grävning.
- **[Quick] Hydraulik-känsla i bommen.** Låt bommen ha en knäled och en mjuk
  "sätt-sig"-rörelse vid tipp så den känns som en maskin, inte en pinne.

### Progression
- **[Medium] Lastbils-kö / leverans.** Spara `custom.lastbilar` (görs redan) som en rad
  fyllda lastbilar som kör iväg och en ny som backar in — gör finalen till en leverans med
  mottagare i stället för en gupp på stället.
- **[Quick] Tydlig fyllnads-mätare** (utöver linjen) som fylls, så barnet ser framsteg.

### Karaktär & berättelse
- **[Medium] Zacke reagerar.** Låt Zacke titta mot skopan, luta sig fram vid grävning, och
  jubla/vinka vid full last; ge lastbilen en förare (Bobo?) som tackar — knyter ihop
  grävare och mottagare (jfr README:s "ingen mottagare"-mönster).
- **[Quick] Koppla flaket till lastbilen** visuellt (flaket *sitter på* 🚛, eller rita en
  egen lastbil i Graphics) så det är tydligt att man fyller *lastbilen*.

### Ljud
- **[Quick] Lugn bygg-ambient** (avlägsen maskin-surr) i botten + ersätt "Gräv mer sand!"/
  "Full last! Tuut tuut!" med riktiga klipp + tuta.

## 5. Status / loggar

- 2026-06-30: Doc skriven utifrån kodläsning + playtest (errorCount 0; sandhög, skopa, Zacke
  och tomt flak renderar). Ersatte den gamla byggspecen. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] kornigt sand-ljud + damm/skak + färgad sand/fynd +
  koppla flak↔lastbil** — bygger direkt på simuleringens styrka och tar bort de tunnaste
  dragen (enfärgad sand, stel lastbil, TTS) för låg risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Implementerade hela den
  rekommenderade första-omgången:
  - **Kornigt sand-ljud:** ett rinnande rassel medan korn faller (kort sawtooth-`tone`,
    intensitet ∝ antal rörliga korn räknade i `_simStep`), ett gruskornigt skrap-`tone` när
    skopan gräver (ersätter `soft`), och en riktig två-tons lastbils-tuta (`tone`×2) vid full
    last i stället för TTS "tuut tuut".
  - **Damm & skak:** dammpuff när sanden rinner ut vid tipp, och ett litet exit-säkert
    skärm-skutt (`shake` på roten) när en stor mängd (≥18 korn) rasar, plus en kort
    skopa-darrning (liten rotation) medan man gräver.
  - **Färgad sand & fynd:** guldkorn (nytt cellvärde `GOLD=4`, faller som vanlig sand,
    ~9 % av spawnade korn) ger glittrande färgvariation i lasten; sim/render/räkning
    utökade till v≤4. Gräver man djupt kan en begravd skatt (💎/🦴/🐚/⭐) dyka upp
    (`_maybeFynd`: sparkle + svävande emoji + `reveal` + röst-beröm, snålt rate-limitad).
  - **Koppla flak↔lastbil:** 🚛 centreras nu under flaket och skalas mot flakets bredd, och
    en mörk chassi-balk ritas under golvet — flaket läser som att det sitter PÅ dumpern.
    Bekräftat i skärmdump (guldkorn syns i lasten, dumpern hänger ihop).
