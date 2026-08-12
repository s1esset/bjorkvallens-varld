# Klappa Mullvaden (`klappa-mullvaden`)
> 🐹 motorik · tap · 2–5 år · status: ✅ marknadsklar

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
- ~~**[Quick] Stigande klapp-pling i rad** + en liten gräs-/jord-skvätt och mjuk hål-mikroskak
  vid varje klapp för mer taktil känsla.~~ ✅ 2026-08-12 (v1.159.0). Jord-skvätten fanns redan
  (`puff` × 7 i jordfärg sedan 08-04); stegen och skaket byggdes nu.

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
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Implementerade de tre rekommenderade
  [Quick]-punkterna ur §4:
  - **Tell före uppdyk:** nytt `telling`-tillstånd — jorden i det utvalda hålet buktar/skakar
    (`_mound.scale`-throb, yoyo ×3 ≈ 0,4 s) + liten jordpuff INNAN djuret reser sig, så barnet
    hinner förvänta sig och sikta (spänning utan tidspress). `_trySpawn` → `_tell` → `_raise`.
  - **Organisk hålplacering:** rutnätet fick jitter (±30 px x / ±18 px y) + per-hål storleks-
    (0,93–1,07) och rotationsvariation (±0,05 rad) → ängen ser handgjord ut, inte genererad.
  - **Riktiga djurläten (inte TTS "Hihi!"):** ny `_critterSound` spelar ett äkta inspelat läte
    när det finns (grodan → `sample('djur_groda')`, [[real-audio-sfx]]), annars ett sött litet
    stigande "pip" med **egen tonhöjd per art** (`audio.tone`, mus ljusast → mullvad mörkast) —
    ger varje art eget ljud. "Hihi!" borttaget ur GENTLE-fraserna.
  - Exit-säkerhet bevarad: mound-tweens dödas i `_killHoleTweens`, tell-`delayedCall` läggs i
    `this._calls`, alla onComplete guardade med `_alive`/tillståndskoll.
- 2026-08-04: **Andra omgången** (errorCount 0) — personlighet, samling och riktiga föremål.
  - **Artspecifikt beteende** (§4 [Medium]): ny `BEHAVIOR`-tabell ger varje art eget uppdyk och
    eget temperament — kaninen skuttar högt och studsar två gånger, grodan hoppar över hålkanten,
    **musen kikar blixtsnabbt** fram (0,2 s res, 62 % uppe-tid), igelkotten kommer långsamt och
    dröjer kvar längst, mullvaden lugnt mittemellan. *Vilken* art som kommer betyder nu något.
    Igelkotten **reser taggarna** när den klappas.
  - **Vänbok som består** (§4 [Medium]): en trätavla längs högerkanten med fem platser. Varje
    art man klappat första gången hängs upp med namn-replik och **stannar kvar mellan
    spelomgångar** (`custom.arter`); tomma platser visas som skuggsilhuetter så man ser vad som
    fattas. Fältet smalnades till FX1=1000 för att ge tavlan plats.
  - **Sällsynt kunglig varelse** (§4 [Medium]): ~9 % chans att djuret bär en ritad guldkrona —
    klappen ger extra gnistor, `reveal` och en bonusstjärna.
  - **P0 ASSETS**: all ängsdekor är nu ritade föremål med egen silhuett — tulpan, prästkrage,
    klöver, grodd, **fjäril med fladdrande vingar** och **krypande nyckelpiga** (båda rör sig, så
    scenen lever mellan uppdyken) — plus ritade tassavtryck i räknar-raden. Inga emoji-rekvisita.
  - **Djup i scenen**: trästaket vid horisonten + klippta gräsränder i stället för en platt kant.
  - **Buggar:** `gsap.delayedCall` (tell + rundbyte) → `ctx.later()`; `this._calls` växte obegränsat
    under en lång session (ett spawn-anrop per uppdyk, aldrig rensat) och är borttaget.
    `_tell`/`_raise`/`_duck`/`_whack` guardar nu mot `hole.destroyed`, så ett hål som rivs mitt
    i ett uppdyk inte kan skriva till en nollställd transform.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): kronan fick `topLightFill`, och **gräsmattan en lodrät gradient**: den var 215 742 px i EN grön ton — appens största enfärgade yta där platt faktiskt var fel (uppmätt med nya `scripts/_plattprobe.mjs`). Ängen läser nu som ett fält som viker undan mot staketet i stället för en grön rektangel. Största fält efter: 32 889 px.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-12: **Klappen känns i marken och bygger något** (§4 [Quick], v1.159.0). Punkten
  lovade tre saker; **en av dem var redan byggd** — jord-skvätten (`puff` × 7 i jordfärg)
  har legat i `_whack` sedan 08-04. De två andra byggdes nu, och båda mättes med nya
  `scripts/_klappprobe.mjs` (de finns bara *medan* barnet klappar, så `npm run test`
  fotograferar en äng i vila och ser ingenting).
  - **Stigande pling i rad.** Klappar som kommer tätare än 2,2 s isär får varsitt steg uppåt i
    en durpentatonisk stege: uppmätt **523 · 589 · 654 · 785 · 872 · 1047 Hz** (C D E G A C')
    och sedan **håller den på 1047** — en stege utan tak blir gäll och blir dessutom en press
    att hålla igång. **Första klappen i en rad får ingen pling alls**, så en ensam klapp låter
    som förut (bara artens eget läte) och stegen hörs först när barnet fått ihop två i följd.
    En paus nollställer den: uppmätt tyst första klapp, och nästa tillbaka på 523 Hz.
    Rena intervall och ingen sampling — `pling`/`correct`/`match` är musik i det här repot
    (CLAUDE.md), och det gäller den här stegen med. Tonen schemaläggs 60 ms fram i
    **ljudklockan** (`tone({ delay })`), inte via en timer: den kan alltså inte överleva en
    exit och behöver ingen städning.
  - **Mikroskak i hålet** vid klapp (`shake`, 5 px / 0,24 s): klappen ska kännas i marken och
    inte bara i djuret. Uppmätt största utslag **4,25 px** och **0 px kvar** efteråt —
    `feedback.js` håller viloläget i `_fxRestPos` just för att ett skak annars får hålet att
    vandra en bit för varje klapp. `_killHoleTweens` dödar nu `_fxShakeTw` explicit (den
    tweenen ligger på ett proxy-objekt och nås inte av `killTweensOf(hole)`).
  - **Sonden var fel innan spelet var det, igen:** de tre sista klapparna i serien kom ut som
    tysta och såg ut som att stegen slutade stiga. Nivå 1 har **mål 5** — rundan var slut och
    `_whack` returnerade direkt. Sonden sätter nu `_p.goal = 99` för mätrundan.
  Kontroll: `check` 0 fel/0 varningar · `npm run test klappa-mullvaden` grön · `_klappprobe` grön.
