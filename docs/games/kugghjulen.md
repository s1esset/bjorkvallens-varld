# Kugghjulen (`kugghjulen`)
> 🧩 pussel · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En varm verkstadsscen med en träbrun pegboard full av små hål. Längst till vänster sitter en
fast röd **vev** med gult handtag; längst till höger ett lila **målhjul** med en stång, en
flagga 🚩, en karusell 🎠 och Elvira 👧. Ur en hylla nedtill drar jag kugghjul i tre storlekar
(liten blå / mellan orange / stor grön — storlek = färg-ledtråd) och sätter dem på pinnarna.
När jag lägger rätt storlek på rätt pinne så att hjulen **greppar** (mittavstånd ≈ r1+r2) tänds
en glöd, en spök-kugg visar nästa pinne och rätt hylsa pulsar vänligt. När kedjan är obruten
från vev till mål ropar rösten "Den greppar! Veva nu!" och hjulen glödpulsar i tur. Då **vevar**
jag (drar veven i en cirkel — eller bara tappar för att den ska veva två varv själv): HELA raden
snurrar på en gång, granne åt motsatt håll, mindre hjul snabbare. Målhjulet hissar flaggan
(åt vilket håll jag än vevar), karusellen snurrar, Elvira hoppar → firande + stjärna, sedan en
längre/krångligare kedja. Tap på ett hjul som inte greppar ger en liten egen snurr-impuls.

Funkar bra: den mekaniska kopplingen är genuint tillfredsställande, glöd + spök-kugg gör målet
självklart, storlek-som-färg är smart, och att hela raden lever när man vevar är en riktig
"jag byggde en maskin"-känsla. Elvira + karusell + flagga ger ovanligt mycket karaktär.

*(Skärmdump: pegboard, röd vev vänster, lila målhjul med flagga + karusell + Elvira, S/M/L-hjul i hyllan.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): barnet **bygger en riktig liten maskin** — lägg kugghjul så de greppar
hela vägen från veven till målet och veva runt. Pedagogiken är orsak-verkan + storleksrelation
(litet hjul snurrar snabbare). Ren geometrisk rotationskoppling (mesh när mittavstånd = r1+r2,
BFS från veven ger djup → riktning (−1)^djup och fart r0/r) — deterministiskt, ingen matter.js.
No-fail: fel hjul snurrar bara fritt, en glödande spök-kugg pekar på nästa pinne, och efter
idle/missar flyger rätt hjul självt dit. Vinschen hissar flaggan oavsett vevriktning så även
fram-och-tillbaka-vevande lyckas. Elvira = enda avbildade människan, som belöning/dekor.

## 3. Vad gör det lättjefullt / tunt

- **Det "pusslet" som finns är starkt guidat — nästan en matchande-lek.** Spök-kuggen visar
  exakt pinne *och* storlek (rätt färg), och rätt hylsa pulsar. Barnets uppgift kokar ner till
  "lägg det glödande hjulet på det glödande hålet". Decoy-pinnar finns (nivå 4+) men leder
  ingenstans och pekas aldrig ut → de blir bara ignorerade, inte ett verkligt val.
- **Auto-hjälpen är dubbel och tidig.** Både `STUCK_HELP` (3 placeringar utan framsteg) och
  `IDLE_HELP` (14s) får rätt hjul att flyga självt till frontier-pinnen. Ett barn som tvekar
  lite får maskinen byggd åt sig.
- **Vevandet kräver ingen skicklighet.** Flaggan hissas på *absolut* rotation åt vilket håll
  som helst, och en ren tap auto-vevar två varv. Glad kludd-vevning = garanterad vinst. Det är
  snällt, men "veva tills full" är inte ett val som påverkar utfallet.
- **Storleks-pedagogiken syns knappt.** Att små hjul snurrar snabbare är sant i koden men
  visuellt subtilt — inget barn märker fart-skillnaden, och inget lyfter fram den ("titta, det
  lilla snurrar fortast!"). Den smartaste idén i spelet går förlorad.
- **Bara tre hjul, ingen ny mekanik per nivå.** Variationen är längre kedjor + jitter + fler
  decoys. Inga special-hjul (back-växel, rem/kedja över ett gap, ett hjul som driver två) som
  skulle göra senare nivåer *annorlunda* snarare än bara längre.
- **Pegboarden är en tom skiva.** Förutom vev, mål och Elvira-klustret finns ingen verkstad —
  inga verktyg, inga rör, ingen rörelse i bakgrunden. Elvira själv bara *poppar* två gånger
  vid vinst; ingen min, ingen gest, ingen reaktion när kedjan greppar.
- **Ljudet är tunt och repetitivt.** Vevandet spelar samma `tap` var 140:e ms (inget riktigt
  spärrhjuls-klack), och greppet är `match`+`reveal`. Ingen mekanisk surr/gnissel-ambient, inget
  stigande "maskinen drar igång"-ljud.

Kort sagt: en vacker och smart maskin vars **bygg-steg är en stark guidad matchning, vars
vevande inte kräver något, och vars storleks-poäng aldrig firas.**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gör decoy-vägarna till ett verkligt val.** Låt en falsk gren ibland *nästan* nå
  målet, så barnet måste välja rätt pinne — och belöna rätt val med extra glöd. Behåll spök-
  kuggen men visa den lite senare, så det första försöket är barnets.
- **[Medium] Senare/synligare auto-hjälp.** Slå ihop `STUCK_HELP` + `IDLE_HELP` till en enda,
  senare trigger som tydligt säger "Jag hjälper med ett hjul!" och bara lägger ETT — resten är
  barnets. Skicklighet ska kännas, aldrig krävas.
- **[Quick] Belöna långsam vevning vs snabb.** Låt vev-farten påverka karusellen/flaggan
  märkbart (snabbare veva → gladare karusell-musik/fart) så vevandet blir uttrycksfullt.

### Variation & överraskning
- **[Deep] Special-hjul per nivå:** en **rem/kedja** som överbryggar ett gap mellan två pinnar,
  ett **dubbelhjul** som driver två grenar, ett **back-hjul** som vänder en karusell. Gör senare
  nivåer kvalitativt nya, inte bara längre.
- **[Quick] Olika mål-belöningar:** karusellen byts mot pariserhjul/hiss/musikspel som målhjulet
  driver — variera vad maskinen *gör*.

### Juice
- **[Quick] Fira storleks-skillnaden.** När kedjan greppar, lägg en kort fart-streck eller
  siffer-puff på det snabbaste lilla hjulet ("Vroom!") så pedagogiken blir synlig och rolig.
- **[Quick] Greppa-juice.** Ett distinkt "klick-i-läge"-ryck + gnistra precis när två kuggar
  möts (inte bara glöd), och ett mjukt ryck genom hela kedjan när vevningen startar.

### Progression
- **[Quick] Synlig maskin-bok/galleri** över byggda maskiner, eller att verkstaden fylls med
  fler drivna prylar (lampa tänds, fläkt snurrar) för varje klarad nivå.

### Karaktär & berättelse
- **[Medium] Elvira reagerar och hejar.** Låt henne titta på bygget, klappa när kedjan greppar,
  och åka karusellen vid vinst — byt uttryck/pose i stället för bara `pop`×2. En levande
  mottagare i stället för en dekor-emoji.
- **[Quick] Liten verkstads-rekvisita** (hängande verktyg, en oljekanna, en sovande katt) som
  vaknar/guppar när maskinen går — fyller den tomma pegboarden med liv.

### Ljud
- **[Quick] Riktiga maskin-SFX via MOSS-pipelinen** ([[real-audio-sfx]]): spärrhjuls-klack vid
  vevning, kugg-grepp-"klonk", och en låg surr-ambient medan kedjan snurrar. Ett stigande
  "maskinen drar igång"-svep när vevningen startar.

## 5. Status / loggar

- 2026-08-10 ✅ **Maskinen har tröghet** (v1.89.0, spår 3 runda P3). Förut satte fingret
  vinkeln rakt av (`_crankAngle += d`): en ensam vev och en maskin med fem hjul kändes
  exakt likadana, och hela poängen med att BYGGA en maskin — att den blir tyngre och
  mäktigare — fanns inte i handen. Nu sätter fingret en önskad FART, maskinen hinner dit så
  fort dess massa tillåter, och när barnet släpper rullar den vidare som ett svänghjul.
  - Trögheten räknas som en skivas (J ∝ r²) och summeras över de hjul som FAKTISKT greppar,
    så den är en direkt avläsning av vad barnet byggt.
  - **Ingen svårighet tillkommer.** En tung maskin går lika långt — den tar bara en stund
    att få igång, och belönar med att fortsätta av sig själv. Flaggan hissas av absolut
    rotation, så utrullningen räknas den också.
  - **Uppmätt** (`node scripts/_vevprobe.mjs`, 8 mått): tom vev tröghet 1,00 och full fart
    efter **5 bildrutor** · femhjulsbygge tröghet **5,77** och full fart efter **36
    bildrutor** · utrullning efter släpp **9,42 rad mot 1,61** · svänghjulet stannar
    (295 bildrutor) · farttaket håller vid ett orimligt ryck (0,500 rad/ruta).
  - ⚠️ **Sondfälla:** hjulen finns inte i `_gears` förrän de dragits ut, så första
    versionen mätte tröghet 1,00 för BÅDA fallen och dömde en fungerande fysik. Sonden
    bygger nu sina egna hjulposter.

- 2026-06-30: Doc skriven (granskning + plan). Speltest grönt (errorCount 0), skärmdump läst.
  Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] fira storleks-skillnaden + [Quick] greppa-ryck +
  [Medium] Elvira som hejar** — lyfter spelets smartaste idé och dess karaktär till låg risk.
- 2026-07-02: Första-omgång implementerad (allt errorCount 0).
  - **[Quick] Fira storleks-skillnaden:** ny `_celebrateSpeed(ctx)` — hittar det snabbaste
    (minsta) drivna hjulet (störst `|factor|`) och lyfter fart-skillnaden med en flytande
    "Vroom!" (`floatText`), gnistor (`sparkle`) och en piggpuls; hoppar över om inget hjul är
    mindre än veven (`|factor| ≤ 1.05`). Schemaläggs från `_onChainGrips` efter glödvågen.
  - **[Quick] Greppa-ryck/juice:** `_onChainGrips` fick ett distinkt "klonk"-klick-i-läge
    (`audio.tone` 300→150 Hz) plus en gnistrande, stigande-tonad ryck-våg (`sparkle` + korta
    toner) som vandrar längs kedjan i djupordning ovanpå den befintliga glödpulsen.
  - **[Medium] Elvira som hejar:** ny `_setElvira(emoji,{hop})` (byter uttryck + puls + valfritt
    hopp via proxy-tween). Hon tittar på bygget (😊 per placerat hjul i `_placeFromDispenser`),
    klappar 🙌 med hopp när kedjan greppar (`_onChainGrips`), och åker karusellen (🥳 + guppande
    orbit runt `_carousel` i `_onComplete`). `_positionMachine` lagrar `_elviraHome` och återställer
    minen till 👧 per nivå.
  - **Bugfix (upptäckt av speltestet):** ny `_popScale(view,scale)` som alltid pulsar från
    basskala 1. `pop()` läser nuvarande skala som "bas", så när `_onChainGrips` pulsade det
    precis placerade hjulet mitt i dess `bounceIn` fastnade hjulet på ~0.19× (renderades pyttelitet).
    Alla hjul-/Elvira-pulser i grepp-/fart-/tap-vägarna går nu via `_popScale`. Verifierat via
    scen-dump: placerat hjul `sx:1, w:153` (tidigare 0.19/29).
  - Test: `node scripts/test-game.mjs kugghjulen --url http://localhost:5173 --drag "700,660>362,367"`
    → errorCount 0; skärmdump visar full-stort glödande orange M-hjul i grepp mellan vev och mål,
    Elvira 🙌, karusell + flagga. Inga stray-bars.
  - Deferred: [Medium] verkligt decoy-val, [Medium] sammanslagen senare auto-hjälp, [Quick]
    veva-fart→karusell-uttryck, [Deep] special-hjul (rem/dubbelhjul/back), [Quick] varierade
    mål-belöningar, [Quick] maskin-galleri/verkstads-rekvisita, [Quick] riktiga maskin-SFX (MOSS).
- 2026-08-09 ✅ **Tyngd i draget [Quick]** (v1.69.0): föremålet följer fingret med en liten eftersläpning, lutar åt dragets håll och landar med en tryckning i målet (delat i `DragController`). Här tändes dessutom lyft-skuggan (`skugga: true`) — spelet ritar ingen egen. Mätt med `_dragprobe`: 13 px släp, 0,108 rad lutning, skuggan borta och lagret tillbaka efter släpp, 0 konsolfel vid exit mitt i drag.
</content>

