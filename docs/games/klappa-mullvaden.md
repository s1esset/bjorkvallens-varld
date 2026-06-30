# Klappa Mullvaden (`klappa-mullvaden`)
> 🐹 motorik · tap · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En marknadsmässig blomsteräng (sol, moln, kullar, spridda blommor/fjäril/nyckelpiga) med
en rundad gräsmatta. I ett rutnät (3×2 → 4×3 med nivån) ligger jordhögar med mörka hål.
Lugnt kikar ett sött djur upp ur ett hål — **mullvad, kanin, igelkott, mus eller groda**,
alla fint ritade i Pixi Graphics med ögon, nos, leende och (när de klappas) rosiga kinder.
Djuret reser sig med squash/stretch + jordpuff, andas mjukt som inbjudan, blinkar då och då.

Jag klappar (tap) ett uppe-djur → ring + 'pop'/'pling' + pop/wiggle, glad min (kisande
ögon, större leende, kinder), en JOY-emoji (😄🥰✨) flyter upp, jordpuff, och djuret studsar
glatt och dyker ner. En 🐾-rad upptill fyller ett avtryck per klapp. Inget straff: ett djur
som inte hinns klappas dyker bara ner av sig själv (uppe-tid golv 1,8s). När målet (4–12
klappar) nås: alla djur duckar, delat firande (complete) + mjuk skak + en skur, och en ny
livligare runda (fler hål/arter, snabbare uppdyk, fler uppe samtidigt). Tomt tryck i hål/på
äng = mjuk puff + närmaste hål wiggle. Idle ~6s → talad recue + ett djur lockas fram.

**Funkar bra:** djuren är genuint söta och varierade, uppdyket har liv (squash, andning,
blink), masken som klipper djuret vid hålkanten ger äkta "ur hålet"-känsla, 🐾-raden är ett
konkret framstegsmått, no-fail och snäll ton är intakt.

*(Skärmdump: äng med 6 hål i rutnät, en mullvad kikar upp ur nedre högra hålet.)*

## 2. Ursprunglig plan & tankeprocess

En medvetet SNÄLL variant av "whack-a-mole" (kodhuvudet betonar detta): ingen miss, inget
straff, ingen tidspress — djur väntar tålmodigt och duckar mjukt av sig själva. Syftet är
hand-öga-koordination + reflex-glädje för 2–5 år, med tydlig positiv återkoppling på varje
klapp. Artvariationen och den mjuka nivåtrappan (fler hål, fler arter, kortare uppe-tid)
ger upptäckarglädje utan att någonsin bli stressande.

## 3. Vad gör det lättjefullt / tunt

- **Rutnätet avslöjar sig.** Hålen sitter på exakta rad/kolumn-koordinater (`FX0..FX1`,
  `FY0..FY1`) utan jitter — det ser "genererat" ut, inte som en lekfull äng.
- **Djuren är skins, inte personligheter.** Mullvad/kanin/groda ser olika ut men gör exakt
  samma sak: upp → andas → klappas → samma fniss → ner. Ingen art har eget ljud, egen fart
  eller eget beteende (groda hoppar inte, kanin skuttar inte).
- **Hålen är inerta tills ett djur kommer.** Ett tomt hål ger bara en liten puff. Inget
  lever i scenen mellan uppdyk — inga maskar, fjärilar som flyger, inget att titta på.
- **"Hihi!"/beröm är talad text, inte ljud.** GENTLE-fraserna och fnisset sägs av TTS-rösten
  istället för riktiga skratt-/djurläten. Utan ljud finns ingen hörbar belöning alls.
- **Generisk belöning.** Samma konfetti+stjärna som överallt; djuren samlas inte, ingen
  "djurbok", ingen anledning att minnas vilka man klappat.
- **🐾-raden nollställs varje runda.** Den känns mer som en kvot att fylla än en samling —
  inget byggs upp över tid.
- **Ingen "var kommer nästa?"-spänning.** Uppdyken är jämnt slumpade utan tell; det blir
  reaktivt snarare än förväntansfullt.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Artspecifikt beteende.** Låt grodan studsa upp högre, musen kika snabbt fram-
  och-tillbaka, igelkotten resa taggar vid klapp. Då blir *vilket* djur som dyker upp ett
  litet val ("vänta på grodan!") snarare än utbytbar grafik.
- **[Quick] Tell före uppdyk.** Jorden i ett hål skakar/buktar 0,4s innan djuret kommer →
  barnet hinner förvänta sig och sikta. Bygger spänning utan tidspress.

### Variation & överraskning
- **[Quick] Organisk hålplacering.** Lägg in jitter/poisson-spridning + lite storleks- och
  rotationsvariation på jordhögarna så ängen ser handgjord ut, inte som ett rutnät.
- **[Medium] Sällsynt gyllene djur / överraskning.** Ibland kikar en kronprydd mullvad eller
  ett djur som håller en blomma upp — klapp ger extra gnistor + bonusstjärna (egen wow,
  som guldballongen i grannspelen).

### Juice
- **[Quick] Riktiga djurläten + fniss.** Knyt klapp till inspelade söta pip/fniss via
  SFX-pipelinen ([[real-audio-sfx]], `sample('djur_…')`) per art — inte TTS "Hihi!".
- **[Quick] Stigande klapp-pling i rad** + en liten gräs-/jord-skvätt och mjuk hål-mikroskak
  vid varje klapp för mer taktil känsla.

### Progression
- **[Medium] Bestående samling.** Låt 🐾-raden eller en liten "vänbok" nedtill fyllas med ett
  djur-ansikte per art man klappat och *behållas* mellan rundor — något att återkomma till.
- **[Quick] Mjuk bakgrundsväxling** (cross-fade ängen mot kväll/blommande) vid nya nivåer så
  världen känns sammanhängande, inte bara "samma äng igen".

### Karaktär & berättelse
- **[Deep] En liten värld.** En mask/fjäril som faktiskt rör sig mellan hålen, eller en
  vänlig Bobo som sitter på en kulle och vinkar/jublar när man klappar — gör scenen levande
  och ger en egen vinst-animation istället för generisk konfetti.

### Ljud
- **[Quick] Lugn äng-ambient** (fågel/vind) i bakgrunden + varierat berömsting (verifiera att
  global variation triggas här).

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; äng + 6 hål + mullvad renderar korrekt).
- Rekommenderad första-omgång: **[Quick] tell före uppdyk + organisk hålplacering + riktiga
  djurläten** — gör scenen levande och spänningen begriplig för minst risk.
