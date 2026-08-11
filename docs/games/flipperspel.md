# Flipperspel (`flipperspel`)
> ⚙️ fysik · tap · 3–5 år · status: ✅ marknadsklar
>
> **OBS geometri:** bordet ligger i x 250–1030, y 112–708 (inre spelyta x 270–1010, y 152–708).
> Paddelpivåer (458,596)/(822,596), spetsar i vila (590,668)/(690,668), drän-springa 100 px.
> Paddlarna är KINEMATISKA (statiska kroppar som räknas om från pivån varje bildruta) — sätt
> aldrig tillbaka en `Matter.Constraint` här, den drev iväg kropparna 30–90 px.
>
> **OBS banelement:** snurra (640,550) r32 · fenor (452,500)/(828,500) 96×24 lutade ±0,524 rad ·
> tunnelmynningar (296,380)/(984,430) r30. Dyn-positionerna klampas till y ≤ 428 så luckan ner
> till fenorna/snurran alltid är < 56 px (kulans bredd), dvs. TÄTAD. Regeln som allt vilar på:
> inget par av ytor får bilda en **nedåt smalnande kil** — varje passage ska antingen vara
> bredare än 100 px hela vägen eller helt tätad. Mellanlägen klämmer fast kulan.

## 1. Nuläge (sett som spelare)

Ett mörkt arkad-flipperbord mot en stjärnnatt. En glansig vit kula faller nedåt mot **två
stora orange paddlar** längst ner. Jag tappar **vänster skärmhalva** → vänster paddel slår
upp, **höger halva** → höger paddel. *(§1 skrevs 2026-06-30; sedan 2026-08-06 har bordet även
snurra, studsfenor, tunnel och tre ritade dynetyper — se §5.)* Paddlarna är armar som drivs med
vinkelhastighet, så de svingar snabbt upp och fjädrar tillbaka — och eftersom de har fart
*kickar* de kulan på riktigt. Kulan studsar mot **bumpers** (runda ⭐-dynor i färgade
glödringar) som **tänds** och spelar en ton ur en liten stigande "pling-skala". Tänd ALLA
bumpers → firande + nästa runda.

Rinner kulan ut genom drän-springan i mitten är det **aldrig** en miss — den serveras mjukt
igen uppifrån med ett `pop` + ibland en 😄. Två kontroller ändrar utfallet: paddel-timing
(vänster/höger i rätt stund) och en **lutnings-knapp** (☁️ Lugnt / ⚡ Snabbt) som växlar
gravitationen via `setGravity`. Händer inget på ~12 s tänds en otänd bumper "av magi".

**Funkar bra:** paddel-receptet (pin-constraint + fjäder-driven vinkelhastighet) ger äkta
flipper-kick, no-fail-omserven är sömlös, bumper-tonerna + glöden är riktigt tillfredställande,
night-scenen får dynorna att lysa fint, hastighetsklampen (`MAX_SPEED 26`) hindrar
tunnel-buggar, och de gigantiska tryck-zonerna gör paddlarna omöjliga att missa för små fingrar.

*(Skärmdump: mörkt bord med lila ram, 3 bumpers (orange/grön/blå glödring kring stjärnor),
två orange paddlar, vit kula vid drän, "Snabbt"-knapp nere till vänster.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet) var **arkad-glädje utan förlust** — flipper-känslan men med P0:s
no-fail kärna: ingen "ball lost", inga liv, ingen sjunkande poäng. Målet "tänd alla
bumpers" gör en abstrakt maskin till en begriplig samlar-uppgift för en 3-åring. Det
pedagogiska fröet är timing (tryck *när* kulan är nära) + orsak-verkan (tryck → paddel →
kula far). Lutnings-knappen finns för att ge den andra utfalls-ändrande kontrollen
(P0-kravet på advanced-physics-spel) och en lugn-knapp åt de allra minsta. Bumper-tonerna
cyklar avsiktligt en `NOTES`-skala för att ge en känsla av melodi utan en egen tonhöjds-motor.

## 3. Vad gör det lättjefullt / tunt

Solid mekanik, men flera tunna ställen en förälder märker:

- **Ingen karaktär alls.** Bordet är geometri: paneler, dynor, paddlar. Ingen maskot, ingen
  Bobo, ingen figur som hejar eller bor i maskinen. Jämfört med systerspelen (bowling har
  Bobo, gravmaskinen har Zacke) är flippern ansiktslös och kall.
- **Bumpers = identiska stjärn-dynor.** Alla mål ser likadana ut (⭐ i en ring), enda
  variationen är `PLAYFUL`-färgen och en 🎯 på högre nivåer. Inget mål gör något *eget* när
  det tänds — ingen släpper en boll, ingen öppnar en lucka, ingen ändrar banan.
- **Tända-loopen är "studs tills allt lyser".** Det finns ingen delmål-rytm (inga
  ramper, inga banor, ingen multiboll, inget "spara upp"), bara "nudda varje dyna en gång".
  När en dyna är tänd är den klar för alltid — den blir bara en passiv studsyta.
- **Auto-hjälpen kan tända hela banan åt mig.** Var 12:e sekund utan framsteg tänds en
  otänd bumper av magi (`_magicLight`). Ett barn som bara tittar får ändå alla tända → samma
  problem som flera spel: utfallet är garanterat oavsett skicklighet.
- **Lutnings-knappen är subtil.** Skillnaden mellan GY 1.1 och 0.5 syns inte tydligt i
  stillbild; ikonen ☁️/⚡ + ett textord ("Lugnt"/"Snabbt") är hela återkopplingen. Ett barn
  förstår inte nödvändigtvis vad knappen *gör*.
- **Ljudet lutar på UI-blippar.** `flip`, `pop`, `pling`, `reveal`, `match` är generiska
  syntar. Ingen riktig flipper-"klack", inget rejält bumper-"donk", ingen arkad-ambient.
  Serven (`pop`) låter likadant som en bumper-studs.
- **Drän-serven har ingen visuell väg.** Kulan teleporteras till (640,150) och faller. En
  riktig "ny boll laddas"-gest (skjuts in från en ränna) saknas, så omserven känns som en
  hopp-glitch snarare än en del av leken.

Kort sagt: motorn är utmärkt, men **bordet saknar själ och mål-variation, och bumprarna är
passiva en gång tända**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ **[Medium] Aktiva mål, inte bara studsdynor.** Låt en tänd bumper *göra* något: öppna en
  lucka som släpper en bonus-stjärna, tända en ramp som leder kulan, eller starta en kort
  "alla blinkar"-kedja. Ger tändandet en konsekvens bortom färgbyte.
- ✅ **[Medium] Mjuka upp `_magicLight`.** Hjälp bara med den *sista* envisa bumpern (efter
  längre idle), inte vilken som helst var 12:e sekund — så paddel-skickligheten faktiskt
  bär rundan.
- ✅ **[Deep] Banelement som ändrar flödet:** en mittspinnare, en lutande ramp, en "tunnel"
  som spottar ut kulan på andra sidan. Gör varje runda till en liten resa, inte ett platt
  fält av dynor.

### Variation & överraskning
- ✅ **[Quick] Variera bumper-utseende** med egen liten ton/animation per typ, så banan inte
  är fem kloner. (Ritade typer, inte emoji — P0 `ASSETS`.)
- **[Medium] Sällsynt "multiboll"-wow:** en gyllene bumper som, när den tänds, släpper 2–3
  extra kulor en kort stund (no-fail, de bara försvinner i dränet) — ren glädje-explosion.
- **[Quick] Bantema per nivå** via `createScene`-cykel (night → candy → space) med
  cross-fade, så nivå 7 känns ny.

### Juice
- **[Quick] Riktiga flipper-ljud** ([[real-audio-sfx]]): en mekanisk paddel-"klack", ett
  fett bumper-"donk", ett klingande mål-pling. Behåll den stigande skalan men på riktiga
  klipp.
- ✅ **[Quick] Bumper-träff-skak + ljus-blixt.** En kort skärm-mikroskak och en
  expanderande ljusring vid varje tändning gör studsarna saftigare.
- **[Medium] Synlig serve-ränna.** Animera in nya kulan från en liten ränna upptill (skjuts
  in) i stället för att teleportera den — gör no-fail-serven till en del av världen.

### Progression
- ✅ **[Quick] "Bumpers tända"-mätare** som fylls (liten rad ⭐ uppe) så barnet ser hur nära
  rundan är klar — positiv inramning, ingen sjunkande siffra.
- **[Medium] Spara `custom.rundor`** synligt som en liten medaljrad — något att återkomma
  till.

### Karaktär & berättelse
- ✅ **[Deep] En maskot bor i maskinen.** Bobo (eller en liten robot) som tittar fram från
  toppen, rycker till vid varje bumper-tändning och hoppar av glädje när allt lyser — ger
  bordet ett ansikte och en publik. Kan också "kasta in" nya kulan (kopplar serve-rännan).

### Ljud
- **[Quick] Lugn arkad-ambient-loop** i bakgrunden + ett tydligare ljud-/visuellt svar på
  lutnings-knappen (t.ex. hela bordet "andas" långsammare i Lugnt läge) så dess effekt blir
  begriplig.

## 5. Status / loggar

- 2026-08-11 🔔 **Dynorna studsar på riktigt — men bara ihop med en svagare knuff** (v1.142.0).
  Ägaren gav klartecken ("kör vi på det som du rekommenderar"). Rekommendationen blev **inte**
  den uppenbara, och det är hela posten.
  - **Byggt:** dynorna kör `{ isStatic: true, studs: tdef.rest }`, alltså **varje typ bär sin
    egen karaktär för första gången**: blomman 0,68 mjukast, stjärnan 0,75, målet 0,78, klockan
    0,82 studsigast. MÄTT (naken fysik, hoppet): **+11,8 · +26,8 · +33,5 · +42,9 px**.
  - ⚠️ **Att bara väcka dem var FEL, och det syntes bara i en beteendemätning.** Dynan lägger
    redan på en egen impuls vid varje träff (`_kickOff`, +3,2 px/steg). Med en riktig studs
    ovanpå blev dynfältet en energikälla som **höll kulan uppe** — och paddeln är kulans
    främsta energikälla i det här spelet, precis som i ett riktigt flipperbord.
  - **Fyra armar växelvis på SAMMA bana** (tid i nedre bandet / paddelbesök, två körningar):

    | arm | körning 1 | körning 2 |
    |---|---|---|
    | gamla spelet (nollad, kick 3,2) | 26,2 % / 6 | 14,0 % / 3 |
    | väckt + kick 3,2 | **7,6 % / 3** | **9,5 % / 3** ← sämst i båda |
    | **väckt + kick 1,2 (valt)** | **24,0 % / 5** | **29,2 % / 9** ← bäst i båda |
    | väckt + ingen kick | 16,2 % / 3 | 21,6 % / 5 |

    Noll är alltså inte heller rätt: utan nudge blir kulan liggande och rullar på dynan i
    stället för att skickas vidare. **1,2 är en uppmätt sweet spot, inte "mindre är bättre".**
  - ⚠️ **Mätningen ljög två gånger innan den blev ren, och båda felen är värda att minnas.**
    (1) Kulan kan stå **statisk** under firandets lyft — då mäter man ingenting, och en arm gav
    0,0 % / 0 besök. (2) **En studsigare dyna tänder rundan fortare**, så `_checkComplete` byggde
    en NY bana mitt i försöket och armarna jämfördes på olika banor. Med `_total` spärrat och
    statiska rutor bortkastade blev riktningen entydig. Före det gav tre körningar 8,2 → 38,2 %,
    0 → 0 % och 14,6 → 6,4 % — ett myntkast som hade gått att läsa som vilket svar man ville ha.

- 2026-08-11 🧱 **ÅTGÄRDER #6 (ägarrapport): en stolpe blockerade nerfarten så kulan fastnade**
  (v1.139.0). *"Flipperspelet funkar bättre nu i storlek, men en studs stolpe blockade nerfarten
  på sidan så kulan fastnade."* Regressionen kom från v1.138.0: när dynorna krympte flyttades
  fältets kant närmare väggen, och då uppstod ett läge som inte fanns förut.
  - **Vad som saknades:** kilregeln var symmetrisk — samma krav överallt. Men **sidorna är kulans
    väg NER**, och lanvägen stänger dem underifrån. En passage på 70–90 px är där inte en passage
    utan en **ficka**: kulan trillar i och blir liggande. Ny regel: mot `wall` och `guide` krävs
    **≥100 px eller ≤46 px** (`GAP_LANE`), aldrig något däremellan.
  - ⚠️ **Friktion var FEL spår, och det är värt att skriva ner.** Första hypotesen var att
    `setStatic` sätter `friction: 1`, så en trång gång skulle bli en friktionsfälla. Men matter
    tar **`min`** av de två kropparnas friktion (`Pair.update`), så kulans 0,02 vinner alltid.
    Mekanismen är ren geometri, inte friktion. Regeln blev rätt ändå — men av rätt skäl nu.
  - **MÄTT** (`_banprobe.mjs`, ny kontroll över 1 500 banor): trånga korridorer mot vägg/lanväg
    **5 107 → 0**. Fyndet fanns alltså i var tredje bana; ägaren hittade det på några minuter.
  - **Fältet går nu ända ut till väggen** (x 312–968) så en dyna kan ligga **tätt intill** den.
    Ett tätat mellanrum är säkert — kulan kan inte ta sig in — och det är den enda placeringen
    nära väggen som inte är en ficka.
  - **Utplaceringen bytte strategi, och det är mätt tre gånger:** girig bäst-av-N är FEL mål. En
    ny dyna som söker maximalt avstånd hamnar i ett hörn, fältet fragmenteras och nästa dyna får
    ingen plats. Nivå 12, snitt/tak: **bäst-av-900 → 3,4/5** · **"bra nog" 1,25× → 3,3/5** ·
    **ren dartkastning (första giltiga punkten) → 6,6/7**. Slumpen packar bättre än omsorgen.
  - **Reserv för trängsel:** från fjärde dynan får den ligga **tätt intill** en annan om fri
    passage inte finns. Ett kluster är säkert per kilregeln och är dessutom hur riktiga
    flipperbord ser ut. Utan reserven stannade banan på 3–4 dynor.

- 2026-08-11 🎲 **Banan slumpas ut på riktigt — och stolparna går att träffa** (v1.138.0).
  Ägarens andra speltest: *"stolparna var omöjliga att träffa men när jag lyckades så studsade
  det bättre — kan vi göra så flipperspelet har mer slumpmässigt utsatta poäng-bumpers utan att
  de läggs fel eller kolliderar, ev bumpers mindre"*. Båda halvorna visade sig ha samma orsak:
  **allt låg på handlagda koordinater.**
  - **Stolparna satt på y=192 — exakt kulans serverings-höjd.** Kulan föddes alltså BREDVID dem
    och föll förbi; de gick bara att träffa på en studs underifrån. De slumpas nu ut **i
    dyn-fältet** i stället, där kulan möter dem hela tiden.
  - **"Slumpen" var fyra handlagda uppsättningar med ±22 px jitter** — samma bana varje gång,
    bara skakad. Nu samplas varje bana fritt (bäst-av-N så det blir utspritt, inte klumpigt).
  - **Dynorna är mindre: 46 → 34 px radie.** Ägarens egen ledtråd, och den är matematiskt
    riktig: minsta tillåtna centrumavstånd är `2r + 64`, alltså **156 px vid r=46 men 132 vid
    r=34** — det är skillnaden mellan fem och sju dynor på samma fält.
  - **KILREGELN är det som gör "utan att de läggs fel" mätbart.** Kulan är 56 px i diameter, så
    det finns bara två säkra mellanrum mellan två ytor: **≥64 px** (kulan passerar) eller
    **≤46 px** (kulan kan inte ta sig IN, alltså inte fastna). Allt däremellan är en fälla där
    kulan kryper in och kilas fast — för ett barn ser det ut som att spelet hängt sig. Regeln
    fanns redan i den gamla kodens kommentar, men bara som handräknade tal.
  - **MÄTT** (`scripts/_banprobe.mjs`, **1 500 slumpade banor** över sex nivåer): **0 överlapp ·
    0 kilar · 0 utanför fältet · 0 krockar med serveringsläget · 50 dragningar → 50 olika banor**.
    Dyn-antalet växer 4,0 (nivå 1) → 5,7 (nivå 12), max 7 mot tidigare 6. Båda stolparna får
    plats på **2,0 banor av 2**.
  - ⚠️ **Två sondfynd som ändrade koden, inte sonden:** (1) första hinderlistan var handskriven
    (snurra, tunnlar, fenor) och gav **1 251 kilar mot VÄGGARNA och LANVÄGARNA** som listan
    aldrig hört talas om — den läses nu ur `_phys`s **levande kroppar**, för motorn vet allt som
    finns. (2) Ordningen mellan dynor och stolpar är **mätt, inte vald**: stolpar sist ⇒ de
    trängdes undan (1,8 av 2), stolpar först ⇒ de splittrade fältet och nivå 12 kunde få **2**
    dynor i stället för 7. Rätt svar är dynor först och stolpar med en **reserv**: får de inte
    fri passage tillåts de ligga tätt intill en dyna, vilket är säkert per kilregeln.

- 2026-08-11 🏓 **V10b:s FÖRSTA KUND: stolparna studsar på riktigt** (v1.137.0).
  Ägaren pekade ut spelet i speltestet ("flipperspel kan få studs först"). Genomgången gav ett
  annat svar än frågan förutsatte, och det är hela poängen med posten:
  - **Sex av åtta statiska studstal i spelet kan ALDRIG väckas till liv — av ett andra, oberoende
    skäl.** Parets regel är `max(A, B)` och **kulan bär 0,62**. `wall` 0,3/0,4 · `sling` 0,5 ·
    `spinner` 0,55 · `flipper` 0,3 ligger alla under det, alltså hade kulans eget tal vunnit även
    om `setStatic` aldrig nollat dem. **MÄTT som kontroll** (naken fysik): ett statiskt 0,5 ger
    59,4 px hopp både nollat och väckt — **0,0 px skillnad**. Att "flipperkudden inte studsar" går
    alltså inte att fixa med `studs`; den frågan handlar om kulans eget tal eller om `_fireFin`.
  - **Bara två ytor ligger över kulan:** `peg` 0,7 och dynorna 0,68/0,75/0,82. Dynan har en **egen
    impuls** (`_kickOff`, PUSH 3,2) — där vore en väckt studs en dubblering, precis det N13
    varnade för. **Stolpen är spelets enda yta som både ligger över kulans tal och saknar egen
    impuls**, och den är dessutom beskriven i koden som "rent studsobjekt, inget mål".
  - **Byggt:** `_buildPeg` kör `{ isStatic: true, studs: 0.7 }`. **MÄTT** (`_flipperprobe.mjs`,
    naken fysik med spelets geometri — kula r=28 vid 0,62 mot stolpe r=17): hoppet **59,4 → 75,4 px
    (+27 %)**, parets studs **0,62 → 0,70**, och i det körande spelet bär båda stolparna
    `restitution 0.7` i stället för 0. Migreringslistan i `npm run check -- --studs`: **50 → 49**.
  - ⬜ **Öppet, ett ägarbeslut:** dynorna skulle ge **+26,8 px (59,4 → 86,2)** om de väcktes. Det
    är spelets kärnloop och det stackar med `_kickOff`, så det kräver att någon SPELAR bordet.
  - ⚠️ **`_idleprobe` ger `idleFramsteg: 4` — men det är INTE nytt.** HEAD ger exakt samma tal
    (A/B körd i samma pass). Kulan serveras automatiskt och dynor tänds vid kontakt, så ett
    flipperbord gör oundvikligen framsteg utan finger. Räkna inte det som en regression.
  - ⚠️ **Mät ALDRIG en enskild ytas studs inne i det levande spelet.** Fem raka sondfel, alla
    tysta, står dokumenterade i filhuvudet till `scripts/_flipperprobe.mjs`. Kort: en direkt
    skrivning till `position` flyttar inte kroppens hörn · `_phys.update`-ackumulatorn kör upp
    till fem steg per bildruta · en avläsning per bildruta missar en studs som varar tre steg ·
    en liten rund stolpe sprider kulan i sidled. Studskoefficienten hör hemma i en naken
    fysikvärld, som i `_studsprobe.mjs`.

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`374734a`, v1.108.0).
  `_plattprobe --medbakgrund` mätte **295 453 px = 32 % av skärmen** i EN ton.
  Efter D1:s första svep var det HÄR appens största platta fält. Nattscenen runt omkring
  var redan tonad via `createScene('night')`; det var själva bordet som låg platt. En riktig
  flipperplan är BELYST — ljusare uppe där kulan skjuts in, mörkare ner mot flipprarna.
  Bedömningen gjordes mot BILDEN först: ett mörkt spelplan KAN vara legitimt en ton, och
  frågan var om plattheten var avsiktlig. Svaret blev nej.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **295 453 → 54 964 px** (32 % → 6,0 %).

- 2026-06-30: Doc skriven utifrån kodläsning + playtest (errorCount 0). Ersatte den gamla
  byggspecen. Inga kodändringar.
- Rekommenderad första-omgång: **[Deep/Medium] maskot i maskinen + aktiva mål** + **[Quick]
  riktiga flipper-ljud + tänd-mätare** — adresserar de två kärnbristerna (ingen karaktär,
  passiva mål) och ger störst upplevd lyft.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). (1) Bobo bor i maskinen (mönster
  #2): sitter på toppen, rycker till vid varje tändning, "kastar in" nya kulan vid serve och
  gör ett stort glädjehopp när allt lyser — bordet har äntligen ett ansikte och en publik.
  (2) Aktiva mål: en tändning får alla redan tända bumprar att blinka med i en liten kedja +
  ibland en bonus-⭐ — målen reagerar på varandra i stället för att bli passiva när de tänts.
  (3) Tänd-mätare: en lodrät stjärnrad (höger, utanför bordet) fylls per tänd bumper så barnet
  ser hur nära rundan är klar. (4) Saftigare träff: expanderande ljusring + mjuk skärm-mikroskak.
  (5) Auto-hjälpen mjukad (mönster #1): magin tänder bara den SISTA envisa bumpern, och först
  efter längre idle — paddel-skickligheten bär rundan. Riktiga flipper-klipp (#13) väntar på MOSS.
- 2026-07-25: **Ägarrapport: "paddlarna är inte rätt positionerade" + "vi behöver större yta
  för bollen".** Uppmätt före/efter (headless-prob mot den körande modulen):

  | | FÖRE | EFTER |
  |---|---|---|
  | Paddel-pivåer | (500,600) / (780,600) — men kropparna DREV IVÄG | (458,596) / (822,596), drift uppmätt **0,000 px** över 40 s |
  | Paddelspetsar i vila | drivna till ~(610,635) / ~(812,662) → osymmetriskt, springa ~130 px | (590,668) / (690,668) → symmetriskt, springa **100 px** |
  | Spelyta (inre) | 520 × 580 px (x 380–900, y 120–700) | **740 × 556 px** (x 270–1010, y 152–708), +42 % bredd |
  | Kulans faktiska rörelse (40 s) | — | x 298–982, y 180–748 → utnyttjar 684 av 740 px |
  | Paddellängd / tjocklek | 125 / 28 | 150 / 30 |
  | Gravitation · fartgräns | 1,1 · 26 (Lugnt: 0,5) | 0,85 · 27 (Lugnt: **0,42 · 18**) |

  **Orsaken till felpositionen:** paddlarna satt i en `Matter.Constraint` (revolute) och drevs
  med vinkelhastighet + varje bildrutas `Body.setAngle`-klampning. `setAngle` roterar kring
  kroppens masscentrum, inte kring pivån, så constrainten fick dra tillbaka kroppen varje steg —
  nettot blev en drift på 30–90 px. Höger paddel hamnade utanför utloppet och mittspringan blev
  ~130 px, dvs. kulan rann rakt igenom utan att paddlarna kunde nå den.

  **Åtgärder:** (1) Paddlarna är nu **kinematiska** — statiska kroppar vars vinkel *och* centrum
  räknas om från pivån varje bildruta (`pivot + L/2·(cos,sin)`), så drift är omöjlig per
  konstruktion; constrainten är borta. (2) Kicken görs explicit i `_tryKick`: när paddeln
  svingar och kulan är inom `BALL_R + PAD_T/2 + 16` px från paddelsegmentet får den en impuls
  längs paddelns normal, 15 → 25 px/steg från pivå till spets, med ±0,1 rad slumpvinkel.
  Fungerar även när kulan **ligger stilla** på paddeln (då finns ingen ny kollision) —
  uppmätt lyft från paddel till tak: **460–510 px**. (3) Bordet fyller nu designrymden
  (panel 780×596 vid x 250, y 112 — under topp-knapparnas y≤110), med vänster ränna åt
  lutnings-knappen och höger åt tänd-mätaren. Inlane-guiderna går nu ända ner till pivån
  (sneda lanväggar + fyllda kilar) så inget kan smita förbi vid sidorna; enda utgången är
  drän-hålet i mitten, som nu är **ritat** som ett hål. (4) Energibudgeten räknades om: mätning
  visade att kulan med restitution 0,86 + bumper 1,0 + push 6 **aldrig kom under y=537 på 30 s** —
  den studsade för evigt i övre halvan och nådde aldrig paddlarna. Nu: kula 0,62 / luft 0,010,
  väggar 0,30, bumper 0,75, push 3,2 — **paddeln är kulans främsta energikälla**, precis som i
  en riktig flipper. Med flippande spelare: 0–1 drän/30 s; utan flippande: 8 drän/30 s (alltid
  glad om-serve). (5) Lutnings-knappen växlar nu både gravitation OCH fartgräns och byter färg
  (blå ⚡ → turkos ☁️) — effekten syns även för den som inte läser. (6) Två kromade stolpar högt
  upp fyller det tomma översta bandet och pingar när kulan nuddar dem.
- 2026-07-25: **P0 `ASSETS` (fristående objekt).** Bumprarna var en ⭐/🎯-**emoji i en rund
  bricka**. De ritas nu helt programmatiskt som riktiga flipperdynor: skugga, glödring,
  sockelring, kupa, ritat stjärnmotiv (`Graphics.star`) resp. ritad måltavla i tre ringar,
  plus ljusglimt — otänd kupa är mörk, tänd lyser i sin färg. Otända dynor "andas" svagt i
  glödringen. Kulan och paddlarna fick skuggor. Enda kvarvarande emoji är i **UI-kontrollen**
  (lutnings-knappens ⚡/☁️) och i transienta FX (⭐/😄), vilket regeln tillåter.
- Nya röstrepliker: `"Nu rullar kulan lugnt."` och `"Nu rullar kulan snabbt!"` (ersatte de
  aldrig registrerade "Lugnt läge." / "Snabbt läge!") — tillagda i `scripts/voice-phrases.json`,
  väntar på klipp.
- Kvar att göra: riktiga flipper-klipp (#13, MOSS), synlig serve-ränna, multiboll.
- 2026-08-06: **Banelement + dynetyper + eget showläge** (`bafa0a0`, errorCount 0). Bordet var
  ett platt fält av identiska stjärndynor — nu är det en bana.
  (1) **Snurra** rakt ovanför drän-hålet bryter den raka vägen ner och kastar kulan i sidled.
  (2) **Två studsfenor** i det döda bandet vid y=500 slår tillbaka kulan upp-inåt: ett tapp i
  sidan blir en ny chans i stället för ett drän. (3) **Tunnel** — två hål i sidoväggarna.
  (4) **Tre ritade dynetyper** (stjärna/klocka/blomma) med egen silhuett, egen restitution
  (0,68–0,82) och egen klangfärg + överton. (5) **Showläge** som finish: dynorna tänds i en våg
  uppifrån och ner med stigande skala, snurran rusar, kulan lyfts ur banan upp till Bobo som
  fångar den och kastar konfettin — `bigCelebration` är borta. (6) Jitter på dyn-positionerna
  redan från nivå 2; förut var nivå 1↔2, 3↔4 och 5↔6 bokstavligen identiska banor.
  (7) Riktiga klipp där de låg oanvända: `thwip` (paddeltryck), `boing` (kick), `whoosh`
  (tunnel) — `flip` och `pling` fanns aldrig i manifestet och föll igenom till syntes.
  (8) Bobo svarar nu på tryck. (9) **Bugg:** `_toggleTilt` satte `.text` på `_tiltIcon`, som är
  en Graphics sedan 2026-08-04 — en no-op, så Lugnt-läget visade en blixt. Ikonen ritas om nu.

  **Tre kalibreringsvarv innan det satt** (headless-sond mot den körande modulen, 40 s):

  | | 1:a försöket | 2:a | LANDAT |
  |---|---|---|---|
  | Tunnelmynningar | båda y=400 | y=400, svagare fenor | vänster **380**, höger **430** |
  | Fen-kick | 11 | 9,5 | **17** + 250 ms spärr |
  | Utfall | tunneln nåddes ALDRIG (x-spann 518–762) | 17 tunnelresor, **0 paddelkickar** — kulan låst i en tunnel-loop uppe i banan | y 195–620, x 302–979, **16 % vid paddlarna** |

  Lärdomarna: **(a)** mynningar på samma höjd gör tunneln till en loop — den utspottade kulan
  flyger tvärs över rakt in i den andra. **(b)** En SVAG fenkick är värre än ingen: 9,5 lyfte
  kulan ~50 px och den föll rakt ner på samma fena igen (27 fen-slag, 91 % av tiden i
  mellanbandet). Fenan måste nå upp i dyn-fältet. **(c)** Tunneln måste bevara inkommande fart
  (dämpad ×0,9) i stället för en fast utkasthastighet, annars matar den in energi varje resa.
  Placeringsregeln som höll: inget par av ytor får bilda en **nedåt smalnande kil** — varje
  passage är antingen bredare än 100 px hela vägen eller helt tätad (< 56 px, kulans bredd).
  Längsta stillastående efteråt: 89 ms med spelare, 35 ms utan (fastnar-vakten går vid 2600).
- **Sond-gotcha:** `import('/src/games/<id>/index.js')` i webbläsarkontexten ger en EGEN
  modulinstans i Vite dev — inte den som spelet kör. Den levande instansen hämtas via
  `(await import('/src/games/registry.js')).getGame('<id>')`.
- Kvar att göra: riktiga flipper-klipp (#13, MOSS), synlig serve-ränna, multiboll, bantema per
  nivå, arkad-ambient. Noterat: kulan tänder dynor på egen hand, så en runda kan bli klar utan
  ett enda tryck (uppmätt 1 runda/40 s utan input mot 2 med) — inneboende i flipper, och
  tryck gör det snabbare, men värt att hålla ögonen på.
- 2026-08-04: **P0 ASSETS + Bobo får händer.** (1) Fart-knappens ⚡-emoji är ersatt av en
  ritad blixt. (2) Bobo var ett svävande huvud ovanför maskinen; han **greppar nu maskinens
  kant med två tassar**, så bilden läser som en figur som står bakom flipperspelet och tittar
  ner på bollen. errorCount 0.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): stålkulan ritas av delade `makeBoll` (`lib/foremal.js`). Den påklistrade glansprickern är ersatt av en klotgradient — kulan läser som krom i stället för en vit skiva.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-09 ✅ **Karaktärsrigg [Medium]** (v1.71.0): Bobo är en RIGG (`lib/karaktarer.js`), inte en stillbild — `kropp: false` — han står BAKOM maskinen och en kropp hade hängt ner genom bordet; tassarna är hans grepp om kanten. Blicken följer kulan varje bildruta (`toLocal`), `hej` när barnet trycker på honom, `heja` per tänd bumper, `jubel` när allt lyser. Yttre containern är spelets (läge, hopp, träffyta), riggen äger sin egen skala.
