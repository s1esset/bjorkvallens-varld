# Flipperspel (`flipperspel`)
> ⚙️ fysik · tap · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Ett mörkt arkad-flipperbord mot en stjärnnatt. En glansig vit kula faller nedåt mot **två
stora orange paddlar** längst ner. Jag tappar **vänster skärmhalva** → vänster paddel slår
upp, **höger halva** → höger paddel. Paddlarna är revolute-armar som drivs med
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
- **[Medium] Aktiva mål, inte bara studsdynor.** Låt en tänd bumper *göra* något: öppna en
  lucka som släpper en bonus-stjärna, tända en ramp som leder kulan, eller starta en kort
  "alla blinkar"-kedja. Ger tändandet en konsekvens bortom färgbyte.
- **[Medium] Mjuka upp `_magicLight`.** Hjälp bara med den *sista* envisa bumpern (efter
  längre idle), inte vilken som helst var 12:e sekund — så paddel-skickligheten faktiskt
  bär rundan.
- **[Deep] Banelement som ändrar flödet:** en mittspinnare, en lutande ramp, en "tunnel"
  som spottar ut kulan på andra sidan. Gör varje runda till en liten resa, inte ett platt
  fält av dynor.

### Variation & överraskning
- **[Quick] Variera bumper-utseende & emoji** (🔔, 🍭, 🌟, 🎈) med egen liten ton/animation
  per typ, så banan inte är fem kloner.
- **[Medium] Sällsynt "multiboll"-wow:** en gyllene bumper som, när den tänds, släpper 2–3
  extra kulor en kort stund (no-fail, de bara försvinner i dränet) — ren glädje-explosion.
- **[Quick] Bantema per nivå** via `createScene`-cykel (night → candy → space) med
  cross-fade, så nivå 7 känns ny.

### Juice
- **[Quick] Riktiga flipper-ljud** ([[real-audio-sfx]]): en mekanisk paddel-"klack", ett
  fett bumper-"donk", ett klingande mål-pling. Behåll den stigande skalan men på riktiga
  klipp.
- **[Quick] Bumper-träff-skak + ljus-blixt.** En kort skärm-mikroskak och en
  expanderande ljusring vid varje tändning gör studsarna saftigare.
- **[Medium] Synlig serve-ränna.** Animera in nya kulan från en liten ränna upptill (skjuts
  in) i stället för att teleportera den — gör no-fail-serven till en del av världen.

### Progression
- **[Quick] "Bumpers tända"-mätare** som fylls (liten rad ⭐ uppe) så barnet ser hur nära
  rundan är klar — positiv inramning, ingen sjunkande siffra.
- **[Medium] Spara `custom.rundor`** synligt som en liten medaljrad — något att återkomma
  till.

### Karaktär & berättelse
- **[Deep] En maskot bor i maskinen.** Bobo (eller en liten robot) som tittar fram från
  toppen, rycker till vid varje bumper-tändning och hoppar av glädje när allt lyser — ger
  bordet ett ansikte och en publik. Kan också "kasta in" nya kulan (kopplar serve-rännan).

### Ljud
- **[Quick] Lugn arkad-ambient-loop** i bakgrunden + ett tydligare ljud-/visuellt svar på
  lutnings-knappen (t.ex. hela bordet "andas" långsammare i Lugnt läge) så dess effekt blir
  begriplig.

## 5. Status / loggar

- 2026-06-30: Doc skriven utifrån kodläsning + playtest (errorCount 0). Ersatte den gamla
  byggspecen. Inga kodändringar.
- Rekommenderad första-omgång: **[Deep/Medium] maskot i maskinen + aktiva mål** + **[Quick]
  riktiga flipper-ljud + tänd-mätare** — adresserar de två kärnbristerna (ingen karaktär,
  passiva mål) och ger störst upplevd lyft.
