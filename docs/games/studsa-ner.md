# Studsa Ner (`studsa-ner`)
> ⚙️ fysik · mixed · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

Ett plinko-bräde i en spelautomat: en stor ljus spelyta full av bruna träknoppar (en förskjuten
triangel, 2026-10-02) och nederst en rad färgglada fickor. Högst upp följer ett glansigt mynt mitt finger — jag DRAR
det i sidled (en prickad linje + kolumn-highlight visar var det "lutar åt") och SLÄPPER.
Myntet faller helt naturligt under tyngdkraften, pingar livligt mot pinnarna och landar i
en ficka. En ficka **LYSER** (en utropad färg, "Släpp i den gröna fickan!") och myntet har
samma färg — landar det i den lysande fickan fylls en mätare (3 prickar uppe till höger).

Full mätare → firande + stjärna + klistermärke, och en ny nivå (fler fickor, målet flyttar,
fler pinnar). "Fel" ficka ger ett glatt plopp och en liten puff — ingen poäng, aldrig straff.
Vid mount släpps ett demo-mynt mot målet; idle ~6s → röst + ett hjälp-släpp ovanför målfickan;
ett mynt som kilar fast får en mjuk slumpknuff loss.

**Funkar bra:** fallet är livligt och tillfredsställande, no-fail är intakt, den talade
färginstruktionen sår ett pedagogiskt frö (färgord), mätare + nivåstegring finns, exit-säkert.

*(Skärmdump: stort ljust pinnbräde, 4 färgfickor nederst, droppar-mynt med pil högst upp,
ett mynt mitt på brädet, mätare uppe till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet vill lyfta klassisk plinko från "släpp och titta" till en **lek med mål**: en
lysande målficka + ett färgmatchat mynt + en sidleds-drag-kontroll innan släpp. Avsikten var
agens (du *väljer* var myntet faller) utan att fuska bort fysiken — ingen magnetisk styrning,
myntet faller "precis som ett riktigt plinko-mynt" (bara en pytteliten slumpfart i sidled).
Färgmålet ger igenkänning och svenska färgord; anti-fastnar-knuffen och hjälp-släppet
garanterar att det alltid lyckas.

## 3. Vad gör det lättjefullt / tunt

Här bor den ärliga kritiken — för just plinko gör designvalet "ingen styrning" att
kärnkontrollen knappt betyder något:

- **Drag-kontrollen är nästan en illusion.** Eftersom myntet faller helt naturligt och
  pingar slumpmässigt mot pinnarna har drop-x:et väldigt liten påverkan på vilken ficka det
  hamnar i — utfallet är i praktiken **tur**. Den prickade linjen pekar rakt ner, men myntet
  studsar bort från den. Barnet "siktar" men ser ingen tydlig orsak→verkan. Det är raka
  motsatsen till en kärnloop med agens.
- **Auto-hjälpen gör jobbet.** Demo-myntet, idle-släppet (rakt över målfickan) och
  anti-stall-knuffen betyder att en passiv spelare ändå fyller mätaren. Snällt, men tunt.
- **Pinnarna är döda prickar.** De lyser inte, studsar inte, låter olika — de är bara vita
  cirklar. Hela övre brädet är en stor tom cremefärgad yta utan liv.
- **Fickorna har ingen personlighet.** Platta färgade rektanglar; inget "gap" som slukar,
  ingen hög av insamlade mynt, ingen reaktion utöver en puff. Det man "samlar" försvinner.
- **Ingen karaktär/berättelse.** Inget ansikte, ingen maskot, ingen anledning bortom mätaren.
- **Ljudet är sparsmakat.** `tap` på pinnar (hårt strypt), `pop`/`correct`/`pling`. Ingen
  stigande pinn-melodi när myntet rasslar ner, inget "jackpott"-ljud i målfickan.

Kort sagt: *vacker rörelse, men spelaren styr knappt utfallet* — och brädet + fickorna är
livlös rekvisita.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Deep] Ge drop-läget verklig betydelse.**~~ Redan byggd (flyttbar tratt 2026-07-01
  `_positionFunnel` :647, fläkten 2026-08-09 `_buildFan` :286) — uppdagat 2026-09-23.
- **[Medium] Sikt-fönster.** Visa en mjuk, ärlig sannolikhets-tratt (var myntet *troligen*
  landar givet drop-x) i stället för en rak pricklinje som ljuger. Hjälper barnet koppla
  handling till utfall.

### Variation & överraskning
- ✅ ~~**[Quick] Special-mynt & special-fickor.**~~ Stjärnfickan klar 2026-09-23 (v1.251.0): ungefär var femte
  nivå (aldrig den första) bär målfickan guldkant, en ritad stjärna och guldglöd, och ett mynt i
  den fyller TVÅ mätarsteg med en egen stjärnklang (:460, :908). Studsmyntet är inte byggt.
- ✅ ~~**[Quick] Rörliga pinnar/snurror.**~~ Klar 2026-10-03 (F1, `snurror.js`): 1–3 propellrar bland pinnarna
  (se §5). *(Vimpeln är INTE byggd — en rörlig sort räcker tills snurrorna visat sig bära.)*

### Juice
- ✅ ~~**[Quick] Pinn-melodi.**~~ Redan byggd 2026-07-01 (`PEG_SCALE` :83) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Fickan slukar.**~~ Redan byggd (`_gulpBin` :671, myntkrukan `_addCoinToJar` :623) —
  uppdagat 2026-09-23.

### Progression
- ✅ ~~**[Quick] Synlig myntsamling**~~ Redan byggd 2026-08-04 (myntkrukan, `custom.mynt`) — uppdagat
  2026-09-23.

### Karaktär & berättelse
- ✅ ~~**[Deep] En figur under fickorna.**~~ Redan byggd 2026-08-04 (varje ficka har ögon och mun,
  målfickan gapar och gulpar myntet, `_buildBins` :472) — uppdagat 2026-09-23.

### Ljud
- **[Quick] Riktiga SFX** (trä-plink, mynt-plopp) via SFX-pipelinen ([[real-audio-sfx]]);
  variera vinst-stinget. *(2026-09-23: vinst-stinget varieras redan av `complete()`; klippen är
  blockerade — MOSS nere.)*

## 5. Status / loggar

- 2026-10-03 ⚙️ **F1: snurror bland pinnarna** (D16 B4, `snurror.js` ny fil). På nivåns pinngitter byts 1–3 pinnplatser
  (5 rader → 1, 6 → 2, 7 → 3; aldrig översta raden under tratten, aldrig nedersta, minst 150 px mellan två) mot en
  PROPELLER: en lätt stång 56×11 (`density` 0,0015, ≈ 0,9 mot myntets 2,5) fastnålad mitt i platsen med
  `phys.gangjarn(kropp, {x,y})` (styvhet 1, damp 0 — damp ≠ 0 bromsar stel rotation) och en kullagerbroms
  `led.motor({ fart: 0, maxMoment })` = 0,0016 rad/steg² konstant (Coulomb-friktion: den vilar på EXAKT noll, en ren
  luftbromsning når aldrig dit) plus `frictionAir` 0,01. Ett mynt som slår i ena bladet vrider den; fysiken avgör hur
  fort; sedan kör kullagret ut den på ~1,7 s och den står stilla. Taken (P0): `MAX_VF` 0,26 rad/steg (≈ 2,5 varv/s,
  bladspets ≤ 7 px/steg) klämt i `beforeStep` (`_snurraSteg`, avregistreras i `destroy`); bromsen är 100× svagare än
  myntets tyngdmoment så en snurra aldrig kan hålla fast ett mynt; spetsen går 34 px från närmaste pinnyta så den inte
  kan nudda en pinne. Bilden: tre egna noder (`ritaSnurra`) — skugga och nav står still, bladet (röd/blå halva så
  vridningen syns) roterar med kroppen via `phys.link`. Ljud: ett mynt i en snurra klättrar upp samma pinnmelodi
  (`PEG_SCALE`, triangelvåg + en kvint ovanför, skiljer sig från träknopparna), navet studsar till + guldpuff, och
  medan den går runt knäpper den vid varje halvt varv (1320 Hz, högst ett knäpp per 90 ms över alla snurror). Rivs i
  `_buildPegs` (`removeBody` tar leden och länken) och i `destroy`. Fläktens vind (`filter` släpper bara mynt) och
  tratten rörs inte. Mätt i Node (`node scripts/_dag-studsa-ner.mjs`): stöt → vinkelfart 0,256 (taket) → vila på
  1,7 s, navdrift 0,000 px; kontrollarmar: utan broms/luft snurrar den kvar vid 0,26 efter 700 steg, utan gångjärn
  lämnar bladet navet 736 px; hårda slag 14–24 px/steg aldrig över taket; 60 mynt på ett 7-radsbräde med 3 snurror:
  60/60 når fickorna (HEAD 60/60), 0 ute, toppfart 14,2 px/steg (HEAD 14,4), fallets medeltid 4,5 s (HEAD 4,7 —
  inom brus: snurrorna sakta inte ner märkbart). Omätt i webbläsare av byggaren.

- 2026-10-02 ⚙️ **R2: tratten är kinematisk** (D7 B1). `_funnelL/_funnelR` är kvar som matter-kroppar
  men flyttas av `phys.kinematisk` (`_kFunL/_kFunR`, `FUNNEL_FART` 16 px/steg). `_positionFunnel(fx, bar)`:
  under drag får väggarna x som MÅL (`till`), vid släpp BÄRS de dit direkt (`flytta`, ingen kastkraft) så
  myntet som skapas samma bildruta alltid faller in i tratten. Trägrafiken följer väggarnas faktiska
  läge (`_kFunL.bas`), inte fingret. Förut teleporterades väggarna: vid 40 px/bildruta gick 42 av 48
  möten IGENOM. Ett mynt har restitution 0,72, så en vägg på 16 px/steg ger upp till ~27 — medan
  tratten rör sig tas farten över `FUNNEL_KAST` 16 bort för mynt i trattens zon (`_trattTak`, i
  `beforeStep`; tratten vilar vid släpp, så fläkten rörs inte). Fläkten orörd.
  Brädet har inget tak: utan spärr slog tratten 21 av 60 mynt ut genom överkanten — därför får ett mynt
  i trattens zon högst `TRATT_UPP` 5 px/steg uppåt (ett litet skutt). Mätt (`_dag-r2drag.mjs studsa-ner`,
  40 px/bildruta, släpp där tratten står): HEAD igenom 32/40 → nu 0/34, ur bild 0.
  `_flaktprobe` orört i koden men brusigt: HEAD 153 px / 0,48 fickor (6 släpp); fix 1,59 (6) och
  232 px / 0,72 (10 släpp).

- 2026-10-02 🎨 **L2: spelautomat i stället för vit tavla** (`automat.js`, ny fil; natt F5 B3). Brädet
  stod mot en rosa bokehbakgrund och pinnarna var tomma vita ringar (P0 ASSETS-gränsfall). Nu:
  planen sitter i ett lila skåp med tapetmönster, mörka sidopelare med nitar, ett fönster runt
  mätaren, en skylt med guldkant och tindrande stjärnor där myntet hänger, och en ram runt planen
  med ~70 glödlampor som blinkar växelvis (två lager, två tweens). Under den lätt genomskinliga
  tavlan ligger ett ogenomskinligt gräddvitt underlag så den inte blir lila, och svaga färgklickar
  (stjärnor, blommor, prickar — fyllda former, inga ringar) ger plankan ett mönster. **Pinnarna är
  riktiga träknoppar** (`_makePeg`/`_drawPeg`): mörkbrun kula med ljus kupa, glans och en mjuk
  skugga på brädet; de tänds fortfarande gula när myntet slår i. Mätpluppens tomma läge fick en
  ljusare kant så den syns mot pelaren. Fysikkroppar (pinnar r 10, tratt, avdelare), fläkten,
  träffytor och regler är orörda. Allt dekor (`eventMode 'none'`), noll texturbakningar (platta
  fyllningar + skåpets cachade toning), tweens samlas i en lista och dödas i `destroy()`. Omätt
  i webbläsare av byggaren — orkestratorn kollar skärmdumpen.
- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_levelComplete` spelade eget vinstljud,
  eget PRAISE och eget konfettiregn i samma tick som `complete()` — strukna (magin står kvar).
  "Nästa nivå!" kapade berömmet efter 1,7 s, och målfickan kom 0,2 s senare och kapade "Nästa
  nivå!". Nu en kedja med `ctx.narTyst` (:964): beröm → "Nästa nivå!" → målfickan, nivå-token.
  Brädet byggs fortfarande direkt. Nytt: stjärnfickan. `check` 0/0.

- 2026-08-10 🎨 **D1: spelbrädan fick ljus uppifrån** (`054e424`, v1.123.0).
  Brädan låg på **115 361 px i EN ton** (`_plattprobe --medbakgrund`) — appens största
  kvarvarande platta fält och 16 % av skärmen. Den är ingen textpanel utan själva spelytan
  sedd rakt framifrån, så den tål ljus uppifrån. Dämpad ramp (0,04/0,10): crèmen är nästan
  vit och kulorna måste fortsätta läsa mot den. Alpha-vägen i `groundFill`, eftersom brädan
  ligger på 0,78 och ska fortsätta släppa igenom bakgrunden.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **115 361 → 12 739 px.**

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Inga kodändringar.
- Rekommenderad första-omgång: **[Deep] ge drop-läget verklig betydelse** (annars är agensen
  illusorisk) + **[Quick] pinn-melodi + slukande fickor** för känslan.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0, skärmdump sedd — mynt faller & lägger
  sig, ingen jam). Implementerat:
  - **[Deep] Verklig betydelse via flyttbar tratt/ränna.** En fysisk ∨-tratt (två sluttande
    statiska väggar + trä-grafik) sitter överst och FÖLJER siktdraget; myntet faller *in* i
    tratten och styrs rent ner till spouten precis ovanför första pinnraden. Nu börjar fallet
    exakt under fingret (i stället för efter en lång slumpartad rutsch) — sikten är ett synligt,
    fysiskt val, fortfarande äkta plink (ingen magnetisk styrning). Spout-gapet (68px) är rejält
    större än myntet (40px) → kan aldrig fastna; anti-stall-knuffen täcker även trattzonen.
  - **[Quick] Pinn-melodi.** Varje pinn-träff klättrar uppför en pentaton-skala (`PEG_SCALE`,
    per-mynt `_pegHits`) via `audio.tone` — mjukt "plink-plink-plong" — plus en stigande
    jackpott-flärp när myntet når målfickan (skild från pinn-melodin).
  - **[Quick] Slukande fickor.** Fickorna är nu botten-ankrade och gör en snabb squash-"gulp"
    när ett mynt landar (`_gulpBin`): stor glad gulp i målfickan, liten i en "fel" ficka —
    per-ficka-reaktion i stället för en enda utgång.
  - **[Pattern #1] Mjukare auto-hjälp.** Idle ger nu bara en vänlig röst-vink vid ~6s;
    hjälp-släppet kommer först efter ~12s (och nollställs vid minsta beröring) så barnets egen
    sikt hinner betyda något. Demo-släppet vid mount kvar (engångs, instruktivt).
  - FOKUSERAT, inga delade filer rörda. Exit-säkert: trattväggar städas av `phys.destroy()`,
    fick-squash-tweens dödas vid rebuild/destroy, alla callbacks `_alive`-vaktade.
- 2026-08-04: **Tredje omgången** (errorCount 0) — mottagare, levande bräde och en layoutbugg.
  - **Layoutbugg (allvarlig):** mätaren låg på `y=56, x = width-56-i*64` → platserna på x 1224
    och 1160 hamnade **rakt under ljudknappen** (1164–1256) och var helt dolda. Mätaren är nu
    en lodrät kolumn längs vänsterkanten (x 36, y 200/274/348) och alla tre platser syns.
  - **Fickorna är varelser** (§4 [Deep], "en figur under fickorna"): varje ficka har ögon och
    mun. **Målfickan gapar hungrigt** (öppen mun + tunga) medan de andra ler lugnt — mottagaren
    som scenen saknade, utan att ta någon extra plats. Gulpen läser nu som att den äter myntet.
  - **Pinnarna tänds** (§3 "döda prickar"): varje pinnträff blixtrar gult, pulsar upp och
    slocknar igen. Brädet lever medan myntet rasslar ner.
  - **Myntkruka** (§4 [Quick] "synlig myntsamling"): en glasburk längs högerkanten där varje
    insamlat mynt stannar kvar — också mellan spelomgångar (`custom.mynt`, 40 syns).
  - **Bugg:** alla tre `gsap.delayedCall` → `ctx.later()`; pinn-vyerna och krukans tweens
    dödas i `destroy` och vid nivåbyte.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): bollarna ritas av delade `makeBoll` (`lib/foremal.js`) — hela den lokala funktionen blev en rad.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-09 ✅ **Fläkten — agens i stället för plinko-tur** (v1.83.0, spår 3 runda P1). En
  ritad fläkt står på en räls längs brädets innerkant och blåser inåt. Barnet drar den
  upp/ner för att välja på vilken höjd luften tar tag i myntet, eller över brädets mitt för
  att flytta den till andra sidan — **två rälsar, ETT föremål**, så riktningen behöver inget
  ord: den syns på vilken sida fläkten står. Strömmen ritas alltid (fyra bågar som vandrar
  utåt), så kontrollen är upptäckbar utan instruktion.
  **Styrkan är mätt, inte satt på känsla** (`node scripts/_flaktprobe.mjs 10`): tio mynt
  släppta från exakt samma punkt med fläkten åt höger respektive vänster landar **231 px**
  isär = **0,72 fickor**. Nog för att vända en nära-miss till en träff, för lite för att göra
  siktet meningslöst. Kraften går via `speedToAccel()` (px/steg → matter), samma kalibrering
  som magnetfältet.
  ⚠️ **Tre fel som mätningen fångade, alla osynliga i koden:**
  1. Första räckvidden (560 px) lämnade 6 % av kraften kvar i mitten där mynten faktiskt
     faller. Uppmätt verkan: 8 px. En kontroll som inte gör något är en lögn mot barnet.
  2. Sonden mätte sedan en **avstängd** fläkt: den släppte mynt medan demomyntet ännu var i
     luften, och fläkten pausar då med flit. Två mätningar i rad sa 8 och 10 px — båda sanna,
     om en fläkt som inte blåste. Sonden väntar nu på att fläkten blåser.
  3. Strömmen var **vit på ett cremevitt bräde** och syntes inte alls i skärmdumpen. Nu är
     den i fläktens egen blå.
  `_idleprobe` ger 1 framsteg i 2 av 3 körningar — **oförändrat mot HEAD** (2 av 3): det är
  hjälp-släppets egen pinnslump, inte fläkten.

- **2026-10-02 · T2: fläktens kraft per fysiksteg via phys.beforeStep — 57 fps-fysiken blir 60 Hz-fysik.** `_fanForce` registreras en gång i `init` där `_phys` skapas (`_avFlakt`, avregistreras i `destroy`) i stället för att anropas per bildruta före `phys.update`. Före/efter-ordningen mot steget är oförändrad. Per bildruta låg kraften på ett steg → halv verkan vid 30 Hz; nu ges den varje steg.

- **2026-10-02 · F4: fläkten är ett `Vindfalt` (`lib/vind.js`) i stället för en handskriven `_fanForce`.** Band (`rackvidd` 1150, `halvhojd` 104), luftens fart 110 px/steg i mitten, `avtag: { langs: 0.6, tvars: 1 }`; `filter` släpper mynt som lagt sig; `aktiv` = `_fanBlaser()` (paus under hjälp-släpp). `_placeFan` flyttar källan och vänder `luft.x`. Strömmen ritas av `vind.rita` (samma fyra blå bågar 46 → 720 px). **Bevis (Node):** `node scripts/_vindprobe.mjs --bara A` — dagens formel inkopierad som kontrollarm mot Vindfalt, 4 lägen × 240 steg × 80 kroppar: max |ΔF| = 0 och max |Δbana| = 0 (bit för bit); kontrollarmarna (fläkt +1 %, avstängd) syns som dF 1e-4 resp. 6e-3. `--bara B`: samma bana över 60/57/30 fps (0,00 px; kraft per bildruta ger 586 px spann). Webbläsarmätning kvar: `node scripts/_flaktprobe.mjs 10` ska stå på ≈ 0,6–0,8 fickor (HEAD 0,68).
