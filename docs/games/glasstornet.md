# Glasstornet (`glasstornet`)
> ⚙️ fysik · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En pastell glass-värld i tydliga zoner. Överst går en **räls** tvärs över skärmen; på den
åker en liten vagn med en kopa som håller nästa glasskula. Jag drar kopan i sidled (eller
tap-tap:ar var som helst) — en **simulerad prickbana + landningsring** visar exakt var kulan
hamnar — och **släpper** för att tappa den. Ringen blir **grön** när kulan kommer att landa
på glassen, och **faller ner till marken** när den kommer att missa hela kärlet. Kulan
faller med riktig matter.js-fysik ner i **kärlet**, squashar till och nestlar sig.

**Kärlet byts per nivå** — våffelstrut → bägare → skål, i cykel — och de skiljer sig i
*fysik*, inte bara utseende: skålen har en jättebred mynning men låg kant (nästan omöjligt
att missa, men hela tornet står i blåsten), bägaren en smalare mynning men höga raka väggar
som håller de två nedersta kulorna stilla. Alla tre har samma smala hals, så kulorna hamnar
i EN kolumn — aldrig två i bredd. Rösten säger vilket kärl som står framme.

**Motgången är vinden.** En bris växlar riktning fram och tillbaka och blåser både den
fallande kulan och tornet i sidled. Den är SYNLIG: en **vimpel på en flaggstång** står rakt
ut och lyser orange när det blåser, och hänger slak + blir grön när det är lugnt; dessutom
drar vindstreck genom himlen. Prickbanan simuleras med samma vind → guiden ljuger aldrig.
**Honungsburken** på marken (tryck → locket åker av, en droppe rinner) gör nästa kula
klistrig: kulan får en ritad honungsglasyr, mer friktion och lättare massa = tål vinden
bättre. Två kontroller (var/när + klistrig), ett mål.

**Målet är körsbäret.** Till höger står en **måttstock** med lika många rutor som kulor som
behövs; en ruta tänds gult per landad kula och överst sitter körsbäret. När tornet nått upp
hoppar körsbäret ner och kröner glassen, vinden mojnar, tornet fryser, **strössel regnar**
över bygget, och hela glassen flyger till **Bobo** som mumsar ("Mums! Tack för glassen!").
Sedan byggs ett nytt torn — en kula högre (3 → 4) och i nästa kärl.

**Överraskningar:** ungefär var nionde kula är en **regnbågskula** som glittrar medan den
bärs och smäller av i färgexplosion när den landar; ibland får en landad kula **strössel**
eller en **såsdrypning** som ligger kvar. Högst en överraskning per kula, så tornet blir
olikt varje omgång utan att bli rörigt.

Ingen game over: en kula som blåser av, som blir hängande på kanten, eller som kilar fast
på en annan kulas axel i stället för att lägga sig ovanpå, glider av med ett fniss
("Hihi!"/"Hoppsan!") och en ny dyker upp direkt. Kulor som ligger stilla kryper mycket
långsamt mot mittlinjen (mjukglass som sätter sig) så högen tidar upp sig till ett torn.
Hjälpen kommer **sent, synligt och i två steg**: efter två bortblåsta **blinkar
honungsburken** och rösten berättar vad den gör (hjälp som lär ut kontrollen), efter tre i
rad blir kulan automatiskt klistrig — men **magneten går bara till den sista kulan**, så
det är barnets sikte som bär tornet. Idle ~6 s ger röst-recue.

**Funkar bra:** släpp-timing mot vinden är en genuint fin agens-mekanik med tre synliga
lager feedback (vimpel → prickbana → grön/gul/markring), tratten gör att bygget ser ut som
en riktig glass, måttstocken visar höjden utan siffror, och finalen (körsbär → servering →
Bobo mumsar) är helt spel-specifik.

*(Skärmdump: räls + kopa upptill, grön prickbana ner i våffelstruten, honungsburk och Bobo
till vänster, måttstock med körsbär och vindflagga till höger.)*

## 2. Ursprunglig plan & tankeprocess

Designintentionen (ur kodhuvudet) var en **mysig fysik-bygglek** där timing mot ett
svajande torn ger djup utan svårighet. Det kännbara fröet: balans och tålamod — släpp när
tornet lutar rätt. Stapling valdes för att "bygga högt" är universellt tillfredsställande
för småbarn, och svajet + klister-knappen ger de två utfalls-ändrande kontroller som
advanced-physics-spelen kräver. No-fail bärs av att fall är *roliga* (fniss, studs, ny kula
direkt) snarare än bestraffande, plus auto-klister/magnet som garanti. Körsbäret kröner
tornet som ett unikt "klart" i stället för generisk konfetti.

## 3. Vad gör det lättjefullt / tunt

Polerad kärna, men flera tunna ställen:

- **Scenen är bara strut + bakgrund.** Ingen glassbar, ingen kund som vill ha glassen, inga
  andra strutar, ingen disk. Den pastellrosa bubbel-bakgrunden är fin men tom — struten står
  ensam mitt i ingenting. Skärmdumpen visar en kula, en strut och mycket luft.
- **Kulorna är identiska färgcirklar.** En `_makeScoop` = färgad cirkel + glansfläck +
  skugga. Smakerna är bara `COLORS`-värden; ingen är jordgubb-med-prickar, choklad-med-
  -strössel eller mint-med-chips. Ingen smak smakar/ser ut som *något*.
- **Landade kulor gör inget mer.** När en kula blivit liggande är den klar — den pulsar en
  gång (`pop`) och blir sedan en passiv del av stapeln. Ingen smält-glid, inget litet
  ansikte, ingen "mums"-reaktion. Tornet är en trave cirklar.
- **Körsbäret är hela finalen.** Det dråsar ner och studsar — fint — men sedan generisk
  `bigCelebration`. Ingen som *äter* glassen, ingen "varsågod!"-överlämning, ingen strössel-
  regn eller flagg-topp. Glassen byggs och försvinner till nästa torn.
- **Auto-hjälpen kan bygga tornet åt mig.** Tre fall i rad → auto-klister; står ett steg
  från mål i 8 s → auto-klister + magnet som drar kulan mot mitten (`TOWER_CX`). Ett barn
  som släpper slumpvis får ändå ett färdigt torn — släpp-timingen blir då kosmetisk.
- **Svajet syns knappt.** Amplituden (0.1–0.2 i gravitations-x) ger ett mycket litet luta;
  för ett barn ser tornet nästan stilla ut, så "släpp när det lutar rätt"-mekaniken är svår
  att *se* att man bemästrar. Ingen tydlig lutnings-indikator.
- **Ljudet är UI-blippigt.** Släpp = `whoosh`, landa = `pling`/`pop`, fall = `soft`. Inget
  mjukt "plopp" när en kula nestlar sig, inget glatt smask, inget stigande pling per våning.
  "Hihi!"/place-lines är TTS.

Kort sagt: mekaniken är fin, men **världen är tom, kulorna är anonyma cirklar, och
auto-hjälp + osynligt svaj urvattnar timing-skickligheten**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ~~**[Quick] Gör svajet kännbart + läsbart.**~~ ✅ 2026-07-01/07-25 (amplitud + vindflagga).
- ~~**[Medium] Mjuka upp auto-magneten.**~~ ✅ 2026-08-06 — klister och magnet är nu två
  steg, och magneten går bara till den sista kulan. Se §5.
- **[Deep] Smak-staplings-mål:** ibland be om en specifik ordning ("jordgubbe överst!")
  eller färgmönster — en lätt pedagogisk twist (färger/sekvens) ovanpå bygget, fortfarande
  no-fail (fel ordning är bara en till glass).

### Variation & överraskning
- ~~**[Quick] Riktiga glass-smaker.**~~ ✅ 2026-07-01 (`FLAVORS` med egen dekor).
- ~~**[Medium] Topping-överraskningar.**~~ ✅ 2026-08-06 — regnbågskula, strössel, sås. Se §5.
- ~~**[Quick] Variera struten/skålen per nivå.**~~ ✅ 2026-08-06 — och de skiljer sig i
  fysik, inte bara utseende. Se §5.

### Juice
- ~~**[Quick] Mjukt "plopp" + smask**~~ ✅ 2026-07-01. ~~**[Quick] Nestle-squash.**~~ ✅ 2026-07-01.
- ~~**[Quick] Strössel-regn vid finalen**~~ ✅ 2026-08-06 (`_sprinkleRain`).

### Progression
- **[Medium] Glass-galleri / kund-kö.** Spara `custom.torn` (görs redan) som en rad
  färdiga glassar; eller en liten kö av kunder (Bobo/djur) som var och en får sin glass —
  ett skäl att bygga "en till".
- **[Quick] Höjd-mätare** som visar hur nära toppen/körsbäret tornet är (positiv inramning).

### Karaktär & berättelse
- **[Medium] En mottagare.** En glassugen figur (Bobo/djur/Elvira) vid sidan som tittar upp
  längs tornet, gör stora ögon ju högre det blir, och *äter* glassen vid finalen med ett
  "Mums! Tack!" — ger bygget ett syfte och en publik (jfr README:s "ingen mottagare"-mönster).

### Ljud
- **[Quick] Lugn glassbar-ambient** + ersätt "Hihi!"/place-lines med riktiga, gladare klipp.

## 5. Status / loggar

- 2026-06-30: Doc skriven utifrån kodläsning + playtest (errorCount 0; carrier-kula i hand,
  guide-linje + landningsring syns). Ersatte den gamla byggspecen. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] riktiga glass-smaker + nestle-squash + plopp/smask-
  ljud + läsbart svaj** + **[Medium] en glassugen mottagare** — gör världen levande och
  staplingen taktil, för låg risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). (1) Riktiga glass-smaker:
  `FLAVORS` är nu smak-objekt med egen dekor — jordgubb-frön, färgglatt choklad-strössel,
  mint-chokladchips, vanilj-swirl, blåbär-prickar (`_decorateScoop`). (2) Nestle-squash:
  landande kula plattas till och studsar tillbaka som mjukglass (`_nestleSquash`) i stället
  för bara `pop`. (3) Ljud: mjukt "plopp" (`sfx('pop')`) + STIGANDE pentatoniskt pling per
  våning (`audio.tone`) när en kula nestlar sig; glatt "mums"-ton när mottagaren äter. (4)
  Läsbart svaj: amplitud höjd (0.13→0.24 kapat) + nytt balans-lod/pendel uppe till höger
  (`_drawTilt`) som hänger rakt ner och blir grönt vid ~lodrätt = "släpp nu". (5) Glassugen
  mottagare (Bobo, `makeMascot`) vid vänster kant som studsar/gör stora ögon ju högre tornet
  blir (`_reactCustomer`) och MUMSAR glassen vid finalen (🍦 flyger dit, "Mums! Tack!",
  `_serveToCustomer`). Exit-säkert: alla nya tweens (customer.scale, serveTween, squash)
  dödas i destroy; serve-item tweenas via {}-proxy. Ingen fail-state ändrad; ~90 rader.
- 2026-07-25: **Utredning + omgörning efter ägarens rapport** ("saker inte på rätt plats —
  vad är körsbäret? vad gör pendeln?"). Skärmdumpad och kodläst. Fynden:
  1. **Körsbäret hade två halva roller och ingen begriplig.** `_goalMark` var en blek 🍒-emoji
     som svävade fritt på (820, STACK_Y[goal-1]) — 180 px vid sidan av tornet, utan koppling
     till marken, struten eller något barnet kunde göra. Det gick inte att trycka på och
     ändrade ingenting. Vid finalen skapades ett ANNAT körsbär som dråsade ner. För barnet:
     ett svävande bär mitt i luften som plötsligt får en dubbelgångare.
  2. **Pendeln hade ingen funktion i loopen.** `_drawTilt` ritade ett balans-lod på (1086,214)
     som visade `this._lean` (gravitationens x-komponent) ×4,2. Men lutningen syntes ingen
     annanstans: struten och marken ritades statiskt, så pendeln var en avläsare av en osynlig
     kraft. Den gick inte att påverka, förklarade inte sig själv och stod dessutom och svängde
     i tomma luften.
  3. **Felplaceringar:** bärkulan låg på y=120 med `X_MIN=130`/`X_MAX=1150` → den gled in
     ÖVER hem- och högtalarknappen (deras träffytor når x≤140 resp. x≥1140, y≤134) i
     ytterlägena; `STACK_Y` gick upp till y=144 vilket är ovanför bärkulan och delvis under
     topp-knapparna; "rälsen" som koden och röstrepliken pratar om ritades aldrig; handen
     under kulan var helt dold bakom den; maskoten svävade utan kropp på (150,300).
  **Åtgärder:** (a) Layouten ritad om — synlig räls på y=104 med vagn+kopa, bärkula y=176,
  drag 330–950 (fritt från hörnknapparna), stapel 480/396/312/228, mål max 4 kulor.
  (b) Körsbäret = MÅLET: sitter överst på en ny **måttstock** (en ruta per kula som behövs,
  tänds gult i takt med tornet, prickrad ut till tornet vid målhöjden) och hoppar ner och
  kröner glassen när tornet nått upp; ritat som riktigt föremål, ingen emoji.
  (c) Pendeln BORTTAGEN och ersatt av **vind**: samma fysik (gravitations-x) men nu förklarad
  av en vimpel på flaggstång (rakt ut + orange = blåser, slak + grön = lugnt) och vindstreck
  i himlen. (d) Guiden simulerar nu fallet steg för steg med samma vind → ringen är grön vid
  träff och åker ner till MARKEN när kulan skulle missa struten. (e) Struten är en tratt med
  utsvängd våffelkant och smal hals → kulorna hamnar i en kolumn; kulor som blir hängande
  utanför kolumnen (>78 px) glider av med fniss. (f) P0 ASSETS: alla emoji-`Text` borta —
  körsbär, honungsburk (ersätter 💧/🍯-knappen), honungsglasyr, mini-glass och Bobos kropp
  ritas nu som föremål; kulorna har lätt vågig glass-silhuett. (g) Finalen fryser tornet och
  mojnar vinden så firandet inte blåser sönder bygget. `check` grön, `test` 0 fel.
  Nya repliker: "Bygg upp till körsbäret!", "Det blåser! Släpp när flaggan hänger stilla.",
  "Nu blir kulan klistrig!", "Nu är kulan vanlig igen.", "Ett körsbär på toppen!",
  "Mums! Tack för glassen!" (tillagda i `scripts/voice-phrases.json`, väntar på klipp).
- 2026-08-04: **En glasskiosk i stället för tom pastell.** Bakgrunden var en slät
  gradient med några svaga bubblor; nu finns en **randig markis med uddkant** längs
  överkanten, en **hylla med fyra sirapsflaskor** till vänster och en prickig disk längs
  golvet. Scenen har en plats — mekaniken är orörd. errorCount 0.
- 2026-08-06 (`a3628ec`, v1.17.0): **Variation + en ärligare hjälp** (polerings-hög 2).
  1. **Kärlet byts per nivå** — våffelstrut → bägare → skål, i cykel. Skillnaden är
     **fysik**, inte bara utseende: skålen har jättebred mynning men låg kant (nästan
     omöjligt att missa, men hela tornet står i blåsten), bägaren smalare mynning men
     höga raka väggar som håller de två nedersta kulorna stilla. `_buildVessel()` river
     och bygger om de statiska kropparna per torn, och `mouthR`/`columnMax` följer med så
     siktguiden alltid talar sanning. Rösten säger vilket kärl som står framme.
  2. **Topping-överraskningar** — sällsynt **regnbågskula** (~1/9) som glittrar medan den
     bärs och smäller av i färgexplosion + treklang när den landar; annars ibland
     **strössel** eller en **såsdrypning** som ligger KVAR på kulan, så tornet ser olikt
     ut varje omgång. Tak: högst en överraskning per kula.
  3. **Strösselregn** över den färdiga glassen (`_sprinkleRain`) — finishen är glass-egen.
  4. **Hjälpen delad i två steg.** Tre bortblåsta i rad ger bara **klister** (barnet
     siktar fortfarande själv); **magneten går bara till den sista kulan**, och den är
     kapad. Efter två bortblåsta **blinkar honungsburken** i stället och rösten berättar
     vad den gör — hjälp som lär ut kontrollen i stället för att bygga tornet.
  5. **Främre kant** (`_vesselFrontG`) ritas ovanpå kulorna, annars ser bägaren och skålen
     ut som en dekal bakom glassen. Honungslocket landar nu bredvid burken; förr låg det
     tvärs över dess egen kant och lästes som ett rött streck.

  **Mätt fram med en spelande Playwright-sond, inte gissat** — tre fynd som gröna tester
  aldrig hade visat:
  - Skålens grunda slänt **höll kvar** kulorna så två hamnade **i bredd** (bryter hela
    "ETT torn"-idén). Det är `frictionStatic` (matter-default 0,5) som låser, inte
    `friction` — låg friktion ensamt räcker inte.
  - En kula som **kilar fast på en annans axel** (dy≈63 i stället för 84) låste tornet
    snett, och sedan fanns ingen giltig plats kvar för nästa kula — bygget blev
    obyggbart utan att något såg trasigt ut. Sådana landningar glider nu av med ett fniss.
  - `SCOOP_STICKY.frictionAir` 0,02 → **0,055**: det är dämpningen **efter** nedslaget som
    avgör om kulan stannar (vinden rullar annars av den från toppen). Med honung tar ett
    torn nu 5–6 släpp (strut 5, bägare 5, skål 6) mot HEAD-baselinens 6 för tre kulor —
    alltså snällare än förut, trots att den automatiska magneten dragits tillbaka.

  Kvar från §4: [Deep] smak-staplings-mål, [Medium] glass-galleri/kund-kö, [Quick] ambient.
  Nya repliker (väntar på klipp): "En våffelstrut!", "En bägare!", "En skål!",
  "Den här är klistrig!", "En regnbågskula!", "Tryck på honungen! Då blir kulan klistrig."
