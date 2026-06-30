# Bobos Bowling (`bowling`)
> ⚙️ fysik · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En ljus, glansig bowlingbana sedd uppifrån. Längst ner svävar ett blått klot; en
triangel av 🎳-käglor står en bit upp. Jag drar klotet bakåt (slangbella via
`AimLauncher`) — en prickad blå banlinje visar exakt vart det rullar, och hur det studsar
mot kanterna — och släpper. Klotet rullar uppför banan med riktig matter.js-fysik, plogar
genom triangeln, käglorna välter och flyger, och varje vält ger en puff + ett ljud (var
tredje en `pling`). Slås alla → `correct` + `celebrate`, konfetti, beröm, stjärna +
klistermärke, och en ny, lite större triangel (3 → 6 → 10 käglor) byggs.

Två kontroller styr utfallet: dragvektorn (riktning + kraft, med tap-fallback som siktar
på huvudkäglan) och en **Kantstöd**-knapp (🛟) som tänder studsräcken längs kanterna så
klotet aldrig hamnar i rännstenen. Står käglor kvar efter ett kast kommer en glad
"vindpust" + knuff som garanterat välter de sista (no-fail). Maskoten **Bobo** sitter nere
till vänster, hejar vid kast och hoppar vid strike. En liten kägelmätare uppe till vänster
visar hur många som står kvar.

**Funkar bra:** sikt+kraft-kontrollen med kalibrerad pricklinje är genuin agens, fysiken
känns rejäl, no-fail-vindpusten är charmig, Bobo ger scenen ett ansikte, bumpern är en
begriplig knapp som syns ändra banan, och progressionen (3→6→10) är mjuk.

*(Skärmdump: ljus bana, klotet just avlossat, käglorna utspridda uppe till höger mitt i
strike-konfetti; Bobo ler nere till vänster, Kantstöd-knappen nere till höger.)*

## 2. Ursprunglig plan & tankeprocess

Designintentionen (ur kodhuvudet) var ett **goal-based fysikspel** med två kontroller som
båda ändrar utfallet: slangbellan (sikte + kraft) och bumper-toggeln. Bowling valdes för
att orsak-verkan är glasklar för en 3-åring — "dra, släpp, allt välter" — och för att den
prickade banan lär ut sikte utan ord. Bumpern är medvetet en pedagogisk hjälplina: PÅ för
nivå 1–3 (lär kastet), AV från nivå 4 (öppnare bana, mjuk auto-hjälp i ryggen).
Strike-firandet + Bobos hopp ger den tillfredsställande "klart"-känslan, och triangeln
växer per nivå för att hålla "en till!"-suget. Kalibreringen (`previewGravity:0`,
`previewDamp:0.988`) är noga gjord så pricklinjen följer den verkliga banan till ~några px.

## 3. Vad gör det lättjefullt / tunt

Stark kärna, men en kräsen förälder ser flera tunna drag:

- **Banan är en stor tom vit yta.** Hela mittfältet (ca 600×580 px) är blank kräm-färg
  med en glansstrimma — inga riktmärken, ingen pilbana, ingen publik bakom käglorna.
  Skärmdumpen avslöjar det direkt: spelet är klot + käglor + tom matta. En riktig
  bowlinghall myllrar.
- **Käglorna är inert rekvisita tills klotet rör dem.** De står blickstilla, "andas"
  inte, lutar inte, reagerar inte på att klotet närmar sig. De är 🎳-emoji + skugga ovanpå
  en `light`-kropp — ingen egen karaktär, inget ansikte, ingen "oj-nu-kommer-det".
- **Strike = exakt samma firande som alla 68 spel.** `bigCelebration` + `burst` + generisk
  `PRAISE`. Inget bowling-specifikt: ingen "STRIKE!"-skylt som studsar, ingen Bobo-dans
  utöver ett litet hopp, inget kägelrassel-crescendo.
- **Auto-hjälpen spelar nivån åt mig.** Står käglor kvar slår en osynlig vindpust +
  slumpknuff omkull dem (`nudge … * 9`) och efter 1 s tippas resten med tvång
  (`_knockPin`). Generöst — men det betyder att *vilket kast som helst* blir strike, så
  mitt sikte spelar i praktiken ingen roll, vilket urholkar den agens spelet säljer.
- **Bumpern är binär och osynlig i stillbild.** Räckena tänds/släcks (alpha-puls), men för
  ett barn utan ljud är skillnaden subtil; ingen tydlig "PÅ/AV"-stämpel på banan utöver två
  tunna staplar. Knappen säger "Kantstöd" i text — noll-läsning bryts.
- **Ljudet är tunt och UI-blippigt.** Käglor låter `pop`/`pling`, kast = `whoosh`. Ingen
  rejäl trä-smäll, inget kägel-rassel, ingen stigande kombo när 10 käglor faller i rad,
  inget hall-eko. En strike *låter* inte som en strike.
- **Ingen samlare att återkomma till.** `custom.strikes` räknas men visas aldrig — ingen
  "Bobos pokalhylla", inget skäl att minnas en bra omgång.

Kort sagt: mekaniken är riktigt bra, men **banan är en tom matta, käglorna är livlösa, och
auto-hjälpen gör siktet kosmetiskt**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Låt siktet faktiskt betyda något.** Mjuka upp auto-hjälpen från "garanterad
  strike varje kast" till "stötta de 1–2 sista käglorna efter ~2 s". Träffar barnet snett →
  några käglor står kvar och ett glatt **andra kast** (klotet serveras igen) får resten — så
  blir bra sikte = strike på *första*, svagt sikte = fortfarande lyckat, men loopen får en
  riktig båge (sikta → se → fira).
- **[Quick] "Spare"-andrakast som mekanik, inte tvång.** Står käglor kvar, servera klotet
  igen med en pil mot resterande klunga (no-fail behålls, men barnet får sikta en gång till
  i stället för att vinden gör jobbet).
- **[Deep] Lekfulla specialkäglor med varierande utfall:** en "studskägla" som studsar två
  grannar, en stor "bjässe-kägla" som kräver mer fart, en kägla som tänder en stjärna när
  den välts. Rotera per nivå så triangeln inte bara *växer* utan *varierar*.

### Variation & överraskning
- **[Quick] Fyll banan med riktmärken:** klassiska bowling-pilar i mattan, en mittlinje, och
  en målzon-glow runt huvudkäglan. Tar bort "tom vit yta"-känslan direkt och hjälper sikte.
- **[Medium] Käglor med ansikten + förväntan.** Ge käglorna ögon (som glass-/snöbolls-
  spelen) som tittar mot klotet och spärrar upp sig precis innan smällen. Levande mål >
  emoji-rekvisita.
- **[Quick] Banteman per nivå** (rymd, djungel, glass) via `createScene`-cykel, mjuk
  cross-fade vid ny triangel — så nivå 4 inte ser identisk ut med nivå 1.

### Juice
- **[Quick] Riktig smäll-ljudbild.** Knyt an SFX-pipelinen ([[real-audio-sfx]]): en fet
  trä-"klong" vid första kontakt, ett kägel-rassel-kluster vid massvält, och en **stigande
  kombo-ton** ju fler som faller i rad (ersätt fasta `pop/pling`-växlingen).
- **[Quick] STRIKE-skylt + skärmskak.** En studsande "ALLA!"/"STRIKE!"-banner + kort
  skärm-mikroskak skalad mot antal välta käglor — gör vinsten kägel-specifik, inte generisk.
- **[Medium] Käglorna reser sig till nästa frame** med en "snäpp upp"-animation (de har
  redan `back.out`-intro) i stället för att bara poppa in — en bowling-rytm.

### Progression
- **[Quick] Synlig "Kantstöd PÅ/AV"-stämpel** på banänden (lysande räck-pilar + liten ikon)
  så toggeln läses utan ljud och utan text.
- **[Medium] Bobos pokalhylla:** visa `custom.strikes` som en rad pokaler/stjärnor bredvid
  Bobo som fylls över tid — en samlare att återkomma till.

### Karaktär & berättelse
- **[Medium] Bobo som domare/publik.** Låt Bobo (+ ett par åskådare på en bänk i
  bakgrunden) följa klotet med blicken, hålla andan, och vid strike resa sig och dansa en
  egen animation i stället för dagens enkla hopp.

### Ljud
- **[Quick] Hall-ambient + tut.** En låg, lugn bowlinghall-ambient och ett glatt "tuut"/
  klockspel vid strike (utöver `celebrate`). Verifiera att vinst-stinget varieras här.

## 5. Status / loggar

- 2026-06-30: Doc skriven utifrån kodläsning + playtest (errorCount 0; strike triggades av
  test-draget). Ersatte den gamla byggspecen. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] bankägla-riktmärken + STRIKE-skylt/skärmskak +
  synlig Kantstöd-stämpel** + **[Medium] mjuka upp auto-hjälpen till spare-andrakast** —
  störst lyft (tar bort tom-matta-känslan *och* ger siktet betydelse) för rimlig risk.
