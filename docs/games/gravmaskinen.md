# Grävmaskinen (`gravmaskinen`)
> ⚙️ fysik · drag · 3–5 år · status: ✅ marknadskvalitet

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
- ✅ ~~**[Medium] Belöna *hur* man gräver/häller.**~~ Redan byggd (`_digAt` :648 djup × svep;
  lugn häll kvitteras i `_tip` :765, 2026-08-06) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Mjuka upp auto-hjälpen.**~~ Redan byggd (`_gust` :1042: bara det som fattas,
  högst 14 korn, målet sänks aldrig, 2026-08-06) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Ta bort tap-fusket från illusionen.**~~ Redan byggd (`_tapDig` :725: skopan åker
  ner och fyller via samma `_digAt` som draget) — uppdagat 2026-09-23.

### Variation & överraskning
- ✅ ~~**[Quick] Färgad/varierad sand & fynd.**~~ Redan byggd (specialkorn `SPECIAL` :37 per
  last, begravd skatt `_maybeFynd` :669) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Olika laster per nivå.**~~ Redan byggd (`CARGOS` :51: sand · grus · snö · småsten ·
  godis, egen palett och rasvinkel, 2026-08-06) — uppdagat 2026-09-23.
- **[Quick] Befolka bygget:** trafikkoner, en skylt, en kompis-maskin (hjullastare), en
  liten fågel på sandhögen — fyll det tomma mittfältet.

### Juice
- ✅ ~~**[Quick] Kornigt sand-ljud.**~~ Redan byggd som stämda toner (rassel ∝ rörliga korn :948,
  skrap i lastens klangfärg :659, tvåtons-tuta :1060) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Damm & skak.**~~ Redan byggd (dammpuff vid grävning :661 och tipp :775, skutt vid
  ≥18 korn :776, skopa-darrning i `_tapDig`) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Hydraulik-känsla i bommen.**~~ Redan byggd (`_drawBoom` :997: knäled + armen
  sjunker med lasten; tippen studsar tillbaka med `back.out`) — uppdagat 2026-09-23.

### Progression
- ✅ ~~**[Medium] Lastbils-kö / leverans.**~~ Redan byggd (`_deliver` :1090: full dumper kör
  iväg, en tom backar in, Bobo vinkar) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Tydlig fyllnads-mätare.**~~ Redan byggd (`_drawMeter` :571, fast avläsbar färg)
  — uppdagat 2026-09-23.

### Karaktär & berättelse
- **[Medium] Zacke reagerar.** Låt Zacke titta mot skopan, luta sig fram vid grävning, och
  jubla/vinka vid full last; ge lastbilen en förare (Bobo?) som tackar — knyter ihop
  grävare och mottagare (jfr README:s "ingen mottagare"-mönster).
  *Delvis byggd (kontrollerat 2026-09-23):* Zacke lutar sig fram vid grävning
  (`_animateFigures` :350) och Bobo sitter vid ratten och vinkar vid full last. Kvar: Zackes
  eget jubel vid full last.
- ✅ ~~**[Quick] Koppla flaket till lastbilen.**~~ Redan byggd (ritad dumper `_makeTruck` :366,
  flak + last + mätare i en rigg) — uppdagat 2026-09-23.

### Ljud
- **[Quick] Lugn bygg-ambient** (avlägsen maskin-surr) i botten. ⛔ Blockerad: kräver ett nytt
  SFX-klipp (MOSS nere). Andra halvan är gjord: alla fem lasters repliker har klipp, och
  "Tuut tuut!" är ersatt av den stämda tutan.

## 5. Status / loggar

- 2026-09-23 ✅ **Leveranskedjan följer orden** (ägarens beslut, samma dag): lastraden →
  "Bobo kör iväg med lasten!" → nästa lasts intro. Dumpern står kvar full medan lastraden
  sägs och kör iväg i SAMMA ögonblick som Bobo-raden (`_deliver` köar starten via
  `ctx.narTyst`, `_korIvag` är tidslinjen). **MÄTT** (`scripts/_bobokedja.mjs`, ny, spelets
  riktiga `_onFull`): Bobo-raden hörd **1/3 → 4/4**, introt efter Bobo 4/4, riggen i rörelse
  0,5 s efter raden 2/2, 0 kapningar. Priset: finalen är 0–2,9 s längre (dumpern väntar in
  lastraden). Det öppna designvalet nedan är därmed stängt.

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_onFull` spelade eget vinstljud
  och eget konfettiregn i samma tick som `complete()` — strukna. Lastens egen rad ("Full last
  med grus! …") sägs före `complete()` och står kvar. "Bobo kör iväg med lasten!" och nästa
  lasts intro kapade den raden — båda väntar nu med `ctx.narTyst` (FIFO-kö: Bobo före
  introt). ⚠️ **Öppet designval:** Bobo-raden gäller bara medan leveransen pågår (tomma
  dumpern parkerar efter 3,3 s) och utgår annars — vinstraden är 2,3–3,7 s, så den hörs efter
  sand, är på gränsen efter grus/snö och utgår nästan alltid efter småsten/godis. Förut
  kapades den ändå alltid efter 1,3 s. Vill vi alltid höra den räcker det att släppa vakten
  (kön håller ordningen) — priset är en rad om att Bobo kör iväg medan en tom dumper står där. §4 städad: 11 punkter var redan byggda (7 Quick + 4 Medium);
  "Befolka bygget" är öppen, bygg-ambienten väntar på MOSS.

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
- 2026-08-06: **Variationsrundan (hög 2) — 🔧 → ✅.** Kodläsning FÖRE §4 lönade sig igen:
  två av punkterna nedan var kvar precis som beskrivet, men koden avslöjade två fel till
  som ingen doc kände till.
  - **Fem laster i stället för en** ([Medium] "olika laster per nivå"): sand · grus · snö ·
    småsten · godisströssel turas om per nivå. Varje last har egen palett (**även högen man
    gräver ur byter färg** — snönivån har en snöhög, godisnivån en regnbågshög), egen
    kornform/-storlek, egna skatter, egna ljud (skrapets och rasslets klangfärg) och egna
    repliker. Sandens fyra repliker är oförändrade strängar eftersom de redan har klipp.
  - **Egen rasvinkel per last.** Branta laster (snö, småsten) kräver TVÅ cellers fall för att
    glida i sidled och bygger spetsiga koner; lösa laster (sand, grus, godis) lägger sig
    platt. Deterministisk regel, ingen sannolikhet — en sannolikhet hade bara *fördröjt*
    utplaningen eftersom ett vilande korn får ett nytt tärningskast varje steg.
  - **Auto-hjälpen mjukad** ([Medium]): triggern "4 tippningar" är borta — den sköt in magi
    mitt i aktivt spel. Kvar är: 14 s HELT utan handling **och** lasten minst 55 % färdig →
    högst 14 korn, exakt så många som fattas. Målet sänks aldrig längre.
  - **Tap-fusket borta** ([Quick]): tap vid högen animerar nu ner skopan och fyller via samma
    `_digAt` som drag, i stället för `_bucketCount = max(…, 24)`.
  - **Grävandet och hällandet belönas** ([Medium]): fyllnaden skalar med svepets längd *och*
    djupet under högens yta (ett djupt tag ger nästan 3× ett ytskrap). Låg fart vid släpp ger
    en tät stråle med mindre spill + en liten kvittering; ett ryck ger bred spridning. Aldrig
    en tillsägelse när det blir slarvigt.
  - **Fyllnadslinjen ljög** (fynd, ej i §4): målet var 55 korn ≈ 2,4 rader medan linjen satt
    6 rader upp — `total >= target` slog alltid först och linjen var dekoration. Linjen
    härleds nu ur målet (`FILL_FACTOR`), och mätt i sond når lasten den faktiskt.
  - **Full last utlöstes av korn i LUFTEN** (fynd, ej i §4): `_countFill` räknade fallande
    korn, så en enda hög tippning kunde klara nivån direkt — harnessen klarade nivå 0 på
    3,4 s. Nu räknas bara korn som vilar (tom cell under = faller), och nivån kan inte klaras
    medan lasten fortfarande rasar.
  - **Ny finish + mottagare** ([Medium]): den fyllda dumpern kör iväg med lasten (hela riggen
    — flak, last och mätare i en behållare) och en tom **backar in från höger** med en ny
    sorts last. Bobo sitter i hytten och vinkar. Backningspip, damm och tuta.
  - **Fyllnadsmätare** ([Quick]) vid flakets sida, i fast avläsbar färg — med lastens egen
    färg blev snönivåns mätare vit på gräddvitt, alltså osynlig. Den visar den av de två
    vägarna till full last som kommit längst, annars stod den på 45 % när en brant snölast
    redan nått linjen.
  - **Prestanda:** lasten ritas bara om när rutnätet faktiskt ändrats (`_dirty`) — en vilande
    last kostar noll, vilket betalar för de rundade kornen.
  - Mätt med `scripts/_lastprobe.mjs` (sond som *spelar*): nivå 0 sand 4 lass · grus 4 ·
    snö 3 · småsten 3 · godis 6. errorCount 0, `npm run check` 0 fel/0 varningar.
- 2026-08-04: **P0 ASSETS — hela maskinparken ritad.** Grävmaskinen var en 🚜-emoji med en
  **gul ruta med ett 🧒 i** ovanpå (exakt det ASSETS-regeln förbjuder). Nu ritas maskinen
  med larvband, drivhjul, chassi och en **öppen hytt med fönsterruta** där Zacke sitter —
  ritad, med hjälm, och synlig genom rutan i stället för instoppad i en bricka. Dumpern
  (var 🚛) ritas med flak, hytt, tre hjul och strålkastare, och fyllnadsmarkören (var 🎯)
  som en riktig måltavla. errorCount 0.
- 2026-08-09 ✅ **Vilorörelse [Quick]** (v1.70.0): lastbilens kaross guppar på tomgång medan skuggan står still (skuggan flyttad till egen Graphics). Delad `feedback.liv()` med egen fas per föremål. Mätt med `_livprobe`: 4,0 px / ett objekt, 0 tweens kvar efter exit.
