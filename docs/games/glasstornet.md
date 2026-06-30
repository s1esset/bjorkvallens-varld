# Glasstornet (`glasstornet`)
> ⚙️ fysik · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En pastell glass-värld. Mitt på skärmen står en brun våffelstrut; högst upp svävar en
färgglad glasskula i en liten orange hand. Jag drar kulan i sidled (eller tap-tap:ar
rälsen) — en prickad lodlinje + en gul landningsring visar var den hamnar — och **släpper**
(lyfter fingret) för att tappa den. Kulan faller med riktig matter.js-fysik, landar mjukt
på struten, vobblar och nestlar sig. Hela tornet **svajar** lugnt (gravitationens
x-komponent oscillerar), så *när* jag släpper spelar roll lika mycket som *var*. En
klister-glass-knapp (💧→🍯) gör nästa kula klistrigare (mer friktion, lättare) = stabilare.

Ingen game over: en kula som ramlar av studsar mjukt, fnissar ("Hihi!"/"Hoppsan!") och tas
bort — en ny dyker upp direkt. Bara kulor som blir liggande räknas. När `goal` kulor (3–5,
växer med nivån) ligger kvar dråsar ett **körsbär** ner på toppen och vi firar (stjärna +
klistermärke), sedan byggs ett nytt, snäpp högre torn. Faller tre kulor i rad, eller om
tornet står ett steg från mål för länge, blir nästa kula auto-klistrig med en mjuk magnet
mot mitten (no-fail-garanti). Idle ~6 s ger röst-recue.

**Funkar bra:** släpp-timing mot ett svajande torn är en genuint fin agens-mekanik, den
kalibrerade landningsringen + prickade lodlinjen lär ut sikte utan ord, klister-toggeln är
en begriplig utfalls-ändrare, fniss-vid-fall gör misslyckanden roliga, och körsbärs-finalen
är spel-specifik. Settle-logiken (vila-fart + tids-tak) gör att spelet aldrig hänger.

*(Skärmdump: grön kula i handen upptill, prickad lodlinje + gul landningsring, en teal kula
med gnistor på struten, blekt körsbär-mål till höger, droppknapp nere till vänster.)*

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
- **[Quick] Gör svajet kännbart + läsbart.** Öka amplituden en aning och lägg en diskret
  lutnings-indikator (struten/marken tippar synligt, eller en pendel/vattenpass-ikon) så
  barnet *ser* när det är rätt läge att släppa — då blir timing-skickligheten verklig.
- **[Medium] Mjuka upp auto-magneten.** Låt magneten bara fånga den *sista* kulan efter
  längre stall, inte var tredje fall, så bra släpp-timing faktiskt bär tornet.
- **[Deep] Smak-staplings-mål:** ibland be om en specifik ordning ("jordgubbe överst!")
  eller färgmönster — en lätt pedagogisk twist (färger/sekvens) ovanpå bygget, fortfarande
  no-fail (fel ordning är bara en till glass).

### Variation & överraskning
- **[Quick] Riktiga glass-smaker.** Ge varje smak en egen look: jordgubb-prickar, choklad-
  strössel, mint-chips, vaniljswirl. Liten variation, stort lyft i charm.
- **[Medium] Topping-överraskningar:** ibland landar en kula med strössel-puff, en sås-
  drypning eller en flagga; en sällsynt "regnbågskula" som glittrar. Gör varje torn lite
  olikt.
- **[Quick] Variera struten/skålen** per nivå (våffelstrut, bägare, skål) via en liten cykel.

### Juice
- **[Quick] Mjukt "plopp" + smask** ([[real-audio-sfx]]) när en kula nestlar sig, ett
  stigande pling per våning, och ett glatt "mums" vid körsbäret — ersätt UI-blipparna.
- **[Quick] Nestle-squash.** Låt en landande kula squasha/stretcha mjukt som riktig
  mjukglass (kort scale-tween) i stället för bara `pop` — gör staplingen taktil.
- **[Quick] Strössel-regn vid finalen** ovanpå `bigCelebration`, så vinsten är glass-specifik.

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
