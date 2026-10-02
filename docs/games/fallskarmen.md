# Fallskärmen (`fallskarmen`)
> ⚙️ fysik · drag · 3–5 år · status: ✅ (inga byggbara [Deep] kvar; [Medium] "Samla på vägen ner" och "Landningsbok" väntar)

## 1. Nuläge (sett som spelare)

Zacke eller Lova (slumpas, 👦/👧) hänger i en stor randig fallskärm högt på en ljus himmel med
sol, moln och en grön markremsa. Hen sjunker långsamt rakt ned medan en **vind** (banner uppe:
"Vinden blåser →") vill putta åt sidan; lövpartiklar 🍃 blåser åt samma håll. Jag **håller/drar**
vänster eller höger om fallskärmen för att styra emot vinden, ner mot en lila **studsmatta** med
glödring och 🎯 i mitten. Två kontroller ändrar utfallet: (1) kontinuerlig sid-styrning (med
chevron-pilar ◀▶ som tänds åt det håll jag styr, och tap-fallback för de minsta), (2) en
**tyngd-knapp** nere till vänster (🪶 Lätt / 🪨 Tung) som byter fallfart och hur mycket vinden
biter. Landningen är ALLTID mjuk: mitt på mattan → studsande jubel + firande; bredvid → snäll
auto-glid in som firas som träff; långt bort → glad gräslandning + ny runda (ingen krasch).
Vinden ligger i **tre höjdskikt** (F4): luften har olika håll på olika höjd, fallskärmen sjunker genom
dem, och remsor + vita luftdrag + löv visar var den blåser vart; bannerns pil följer luften där fallskärmen är.
En styr-assist växer efter missar så målet alltid nås.

**Funkar bra:** styr-kontra-vind-kärnan är begriplig och taktil, chevronerna + vindbannern +
löven gör krafterna *synliga*, tyngd-knappen är en äkta avvägning (Tung faller snabbare men biter
mindre mot vinden), no-fail är vattentätt med tre snälla landnings-utfall. Skuggan som växer mot
marken ger fин höjdkänsla. Exit-säkert.

*(Skärmdump: randig fallskärm med barn-ansikte, lila studsmatta + 🎯 + glödring, vindbanner uppe, 🪶 Lätt-knapp, lövpartiklar.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): en **styr-mot-störning-lek** där barnet lär sig att hålla emot vinden för
att landa på ett mål — enkel rymdkänsla + orsak-verkan utan tidspress. De ≥2 utfalls-ändrande
kontrollerna är sid-styrning + tyngd-toggle; vinden är den varierande motkraften som gör varje
runda olik. No-fail bakas in med tre landnings-utfall (träff / nära-auto-glid / gräs + omstart)
och en assist som växer per miss (`this._misses`), så även passivt spel landar rätt till slut.
Zacke/Lova är de namngivna förarna (P0).

## 3. Vad gör det lättjefullt / tunt

Solid kärna, men flera tunna drag:

- **Barnet är ett ansikte utan kropp.** `this._kid` är bara en 👦/👧-emoji i selen — ingen kropp,
  inga ben som dinglar, ingen reaktion på vinden eller landningen utöver fallskärmens studs. Ett
  litet "iiih!"/skratt eller dinglande ben vore mycket mer levande.
- **Vinden är konstant per by, inte kännbar i kroppen.** Den syns i banner + löv, men fallskärmen
  lutar bara svagt i *styr*-riktningen (`dir * 0.13`), inte i *vind*-riktningen — så att "vinden
  drar mig" känns mer än det syns på själva skärmen. Kupolen buktar inte i blåsten.
- **Tomt luftrum.** Mellan start (y=150) och mark (y=560) finns bara himmel, moln och löv. Inga
  fåglar, ballonger, moln att glida förbi, inget att samla på vägen ner — fallet är "vänta tills
  marken" snarare än en resa.
- **Målet är passivt.** Studsmattan glöd-andas men reagerar inte när barnet närmar sig; ingen
  publik vid mattan, ingen som väntar på att fånga. 🎯 antyder "prick-skytte" mer än "landa hem".
- **Auto-glid + assist gör mycket av jobbet.** "Nära" (inom 1,8× radien) glider in automatiskt
  och firas som full träff; assisten växer per miss. Bra no-fail, men ett barn som driver med
  vinden landar ändå rätt utan att egentligen ha styrt — agensen kan suddas ut.
- **Tyngd-knappens effekt är svår att se.** Skillnaden Lätt/Tung är fart + vindbett (siffror) +
  en liten kupol-skala; barnet känner den knappt på 400px fall. Den är smart men nästan osynlig.
- **Ljud + röst är tunna.** `tap`/`whoosh`/`pling`/`soft`/`correct`/`celebrate` + TTS ("Nästan!
  Jag hjälper till.", "Hoppsan! Vi provar igen!"). Inget vind-sus som stiger med byn, inget
  tyg-fladder, inget studs-"boing" med karaktär.

Kort sagt: **krafterna är välgjorda men föraren är en själlös emoji och himlen är tom** — det
styrs hem, men det berättas ingen liten resa.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Quick] Vind-lut på fallskärmen.**~~ Klar 2026-08-10: lutningen läses ur den verkliga
  relativfarten mot luften, och kupolen trycks dessutom in från sidan i en by.
- **[Medium] Samla på vägen ner.** Strö ut moln-stjärnor/ballonger i luftrummet som ger en liten
  gnista + pip när fallskärmen glider förbi dem — gör fallet till en resa med val (styr lite för
  att nå dem) utan att äventyra landningen.
- ✅ ~~**[Medium] Gör tyngd-valet kännbart.**~~ Klar 2026-08-10: knappen byter LAST, inte
  fallfart. Tung faller 1,67× fortare, är trögare att styra (190 mot 227 px på en sekund) och
  spänner kupolen 2,8× hårdare — och bytet mitt i fallet accelererar synligt in mot den nya
  gränsfarten i stället för att byta värde på en bildruta.

### Variation & överraskning
- **[Quick] Varierade landningsmål:** studsmatta, höstack, vattenpöl (plask), en väntande
  Bobo-famn — roteras per nivå med eget landnings-ljud.
- **[Quick] Vindkast-överraskning:** enstaka kraftig by med extra lövsvärm + ett "ooh!" som ger
  ett kort, lekfullt sväng (fortfarande inom no-fail).

### Juice
- ✅ ~~**[Quick] Vind-sus som stiger med byn** (loop vars volym följer `Math.abs(this._wind)`) + ett
  mjukt tyg-fladder på kupolen vid sid-rörelse.~~ Redan byggd — uppdagat 2026-09-23: suset är två
  `audio.tone`-lager vars volym och täthet följer byn (index.js:635-645, 2026-07-01), och kupolen
  är tyg som trycks in av byn (`Mjukkropp`, 2026-08-10).
- ✅ ~~**[Quick] Föraren reagerar:** dinglande ben (liten pendel-graf under emojin), armar upp, och
  ett "iiih!"/skratt vid landningen.~~ Redan byggd (benen :588-590, "Iiih!" + toner i `_celebrate`,
  armarna ritade uppsträckta i `makeKid`) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Landnings-boing med karaktär** + dammpuff (redan `puff` vid gräs — lägg motsvarande
  vid mattan) och en kort kamera-mikroskak.~~ Klar 2026-09-23 (v1.251.0): `_celebrate` (:895-903)
  spelar `boing`-klippet (stämd G3→G4 om det saknas) + ett mindre eko vid andra studsen, dammpuffar
  på båda sidor om mattan och `shake(this._root)` 3 px / 0,25 s.

- ✅ ~~**[Quick] Landningen är en fjäder, inte en tidslinje** (FYSIKPLAN P1: "tung hoppare sjunker djupare och kastas högre").~~ Klar 2026-10-02: se §5.

### Progression
- **[Medium] "Landningsbok".** Räkna och visa de olika mål-typer barnet landat på (mattan,
  höstacken…) i en liten samling — `landningar` finns redan i custom, ge den ett ansikte.
- **[Quick] Mjuk scen-crossfade** mellan nivåer (gryning → dag → skymning) i stället för hård
  reset.

### Karaktär & berättelse
- ✅ ~~**[Deep] Mottagare vid mattan.**~~ Redan byggd (`_boboWave`/`_boboCatch`, 2026-08-06) — uppdagat
  2026-09-23. Bobo (eller en kompis) står vid målet, vinkar in föraren,
  fångar/kramar vid träff och hejar — en egen vinst-scen i stället för generisk konfetti, och en
  anledning att vilja landa just där.
- ✅ ~~**[Quick] Föraren får en kropp** (enkel programmatisk Zacke/Lova som i `gungan`/`spindel-zacke`)
  i stället för bara ett ansikte.~~ Redan byggd (`makeKid`, 2026-08-04; noterad i §5 2026-08-06 men
  aldrig struken) — uppdagat 2026-09-23.

### Ljud
- **[Quick] Riktiga SFX från [[real-audio-sfx]]:** vind-sus, tyg-fladder, plask — ersätt
  syntetblippen. ⛔ Kräver nya SFX-klipp (MOSS nere). Studs-boingen använder redan det befintliga
  `boing`-klippet (2026-09-23), och röst-halvan är klar: alla fyra repliker har klipp.

## 5. Status / loggar

- 2026-10-02 · **Vinden i höjdskikt (FYSIKPLAN F4, kluster B4)** — vind-halvan; kupolen (`Mjukkropp`) och gräsmattan
  (`gras.js`, D7) är orörda. Förut var vinden ETT tal för hela luftrummet (`_wind`) som bytte håll på en timer
  (`_windPeriod` 3–6 s mot ett 2,9–4,8 s långt fall: på nivå 0 blåste det åt ETT håll hela vägen ner) och som
  barnet kunde trycka mot de osynliga väggarna vid x 140/1140 (HEAD: 25–63 % av passiva fall på nivå 2–6).
  Nu `vindskikt.js`: tre `Vindfalt` (`band`, vågräta över hela luftrummet, y 190/320/450, halvhöjd 130 så de
  överlappar och farten byter mjukt) med eget håll och egen styrka per skikt (4 mönster ur `MONSTER` × spegling,
  `nastaVariant` så ingen runda liknar förra; alla har skikt åt båda hållen och det lägsta skiktet är aldrig det
  starkaste). Luften provas på fötternas y − 60 i varje FAST steg (`setVind(luftForFot(...))` inne i `Takt`-steget),
  klämd till översta/understa skiktet; skikten sväller och lägger sig på egen tid (`BY_PERIOD`, djup 0,4). Bilden
  (`skiktbild.js`): en ljus remsa per skikt (skiktet fallskärmen är i lite tydligare) + vita luftdrag med krok som
  blåser åt skiktets håll, tätare och snabbare ju starkare det blåser; löven föds i ett skikt och följer luften där de
  är (ett löv som sjunker in i ett annat skikt vänder av sig självt); bannerns pil följer luften vid fallskärmen; ett
  skiktbyte ger `whoosh` + banner-pop + lövsvärm; kupolen buktar av luftkraften som förut (orörd) och benen/lutningen
  läser `this._wind` = luftens vindtal vid fallskärmen. Styrkan: HEADs tal för nivå 0–3 (0,12/0,20), 0,30/0,34 för
  nivå 4/6+ (HEAD 0,28/0,30) — det starkaste skiktet ligger precis under styrningens gränsfart (4,05 px/bildruta).
  **MÄTT** (`node scripts/_skiktprobe.mjs`, spelets `Motstandsvolym` + last + styrkraft + assist, 240 fall per cell,
  nivå 0/2/4/6 × Lätt/Tung): utan vind driver skärmen 0,0 px; passiv drift HEAD 247–495 px (väggkontakt 25–63 % på
  nivå 2–6) → NY 52–224 px (väggkontakt 0 %); Tung driver mindre än Lätt (158 mot 224 px, nivå 6); en greedy-styrare
  träffar mattan HEAD 73–100 % → NY 100 %; hjälpt landning (assist 3 missar) 100 % → 100 %; landningens x ligger
  alltid i 140–1140 (inget lämnar bild). Ingen ny replik.

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_celebrate` spelade eget
  vinstljud + PRAISE + konfettiregn i samma tick som `complete()` — strukna (värdet firar;
  "Nästan! Jag hjälper till." 0,5 s före får nu tala klart i stället för att kapas). Landningen
  på mattan fick boing (befintligt klipp, stämd reserv) + eko, dammpuffar och en 3 px mikroskak.
  Docen: det felplacerade 2026-08-10-blocket (låg före §4) är flyttat hit, sist i loggen.
- 2026-06-30: Doc skriven (granskning + plan, ersätter gammal bygg-spec). Testat headless med
  drag (errorCount 0), skärmdump läst. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] vind-lut på fallskärmen + dinglande ben/skratt + stigande
  vind-sus** — gör vinden och föraren kännbara, störst lyft för minst risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). (1) **Vind-lut:** kupolen lutar nu även i
  *vindens* riktning (`windLean = this._wind * windFactor * 0.8`, clampad) ovanpå styr-luten — barnet
  ser att vinden puttar och att styra rätar upp den; Tung biter mindre (windFactor) så luten blir
  mindre, vilket gör tyngd-valet lite synligare. (2) **Dinglande ben + skratt:** föraren fick ett par
  pendlande ben (Graphics kring en höft-pivot, roteras i ticker efter sidofart + vind + lugn
  grundsväng) och ett litet "iiih!" (floatText + två stigande sine-toner + glad puls på emojin) vid
  den mjuka landningen. (3) **Stigande vind-sus:** en mjuk luft-svallning (två `audio.tone`-lager)
  vars volym OCH täthet följer `Math.abs(this._wind)` — tyst i stiltje, hörbart starkare i byarna.
  Exit-säkert: `this._kid.scale`-tween dödas i destroy; benen är barn till chute (städas med
  `children:true`); vind-sus är ren syntes utan loop. Testat headless (drag, errorCount 0), skärmdump
  läst. Inga shared/lib-ändringar.
- 2026-08-04: **P0 ASSETS + två synliga buggar.** (1) Barnet var **bara ett 🧒-ansikte i selen**
  (§3 första punkten); det ritas nu med kropp, armar, **dinglande ben och skor**, och byter
  frisyr med namnet (Zacke/Lova, rosett för Lova). Måltavlan (var 🎯), löven (var 🍃),
  vikt-ikonen (fjäder/sten, var 🪶/🪨) och riktningspilarna ritas också.
  (2) **Bugg:** vikt-knappens ikon ritades bara i `_toggleWeight`, så den var **tom tills man
  tryckt en gång** — ritningen är utbruten till `_drawWeightIcon()` och körs vid bygget.
  (3) **Layoutbugg:** knappen låg på y=640 med etiketten på +80, alltså y=720 — etiketten
  klipptes av nederkanten. Knappen flyttad till y=600.
  (4) Introrepliken var konkatenerad (`'Hjälp ' + namn + ...`), så `check.mjs` kunde inte hitta
  den och `/rost` kunde aldrig generera ett klipp; den är nu två hela literaler.
- 2026-08-06: **[Deep] Mottagare vid mattan** (spår "20 spel från 🔧 till ✅").
  - Bobo står nu vid studsmattan, **vinkar in föraren** i vila (`_boboWave`, lugn vaggning)
    och **fångar/hejar vid träff** (`_boboCatch` — hopp + gnistor), både vid ren träff och
    efter den snälla auto-gliden. Scenen hade ingen mottagare alls: bara en matta och
    generisk konfetti.
  - Han hör till **målet**, inte till scenen: mattan flyttar sig per nivå (tx 200..1080), så
    `_placeBobo(tx, r)` följer med och väljer den sida som har plats — är det trångt till
    vänster ställer han sig till höger och vänder sig mot mattan (`scale.x`). Han ligger i
    `_root`, inte som barn till `_target`, så mattans landnings-squash inte klämmer honom.
  - **Doc-punkten "[Quick] Föraren får en kropp" var redan gjord** — `makeKid()` ritar ben,
    skor, bål, armar, huvud och hår sedan tidigare. Stryks som klar i stället för att
    byggas om.
  - Exit-säkert: `_boboIdle` + skal-tweens dödas i `destroy`.
- 2026-08-10 ✅ **Luften blev en KRAFT + kupolen blev tyg** (v1.86.0, spår 3 runda P2,
  commits `1ff0d98` · `7690ccd`). Ny delad primitiv `src/lib/luftmotstand.js`
  (`Motstandsvolym`) med fallskärmen som första kund, och `lib/mjukkropp.js` fick
  `falt(ax, ay)` med kupolen som fjärde kund.
  - **Vad HEAD faktiskt gjorde** (uppmätt med nya `scripts/_fallprobe.mjs`, inte gissat):
    95 % av fallfarten nåddes efter **0,07 s** — alltså ingen acceleration alls, fallet var
    `chute.y += sink * dt`. Styrningen gav **248 px (Lätt) mot 245 px (Tung)** på en
    sekund, så tyngdknappen gjorde ingenting åt styrförmågan. Vinden var ett eget tal med
    en handsatt tyngdfaktor (0,45).
  - **Nu en lag:** motstånd mot farten *relativt luften*. Gränsfarten faller ut ur massa
    mot kupolarea, vinden är luftens egen hastighet (därför driver en lätt last med byn
    medan en tung släpar efter), styrningen möter samma motstånd.
  - **Efter** (samma sond): Lätt 4,87 s och 75 → 82 px/s · Tung 2,97 s och 119 → 137 px/s ·
    **kvot 1,67× = exakt HEADs uppmätta kvot** · accelerationen syns (95 % efter 0,20
    resp. 0,32 s) · vinddrift@1s 148/108 px · **styrning@1s 227/190 px** — knappen ändrar
    nu tre saker samtidigt i stället för två.
  - **Kupolen buktar av kraften den bär:** 2,8 px på en lätt last, 7,8 px på en tung
    (2,8×), 10,4 px insida i en by, och ett lastbyte *svänger* in på 0,18 s.
  - **Fyra fällor, alla dokumenterade i koden:** (1) en acceleration och en kraft är inte
    samma sak — med styrningen som acceleration drev den TUNGA lasten längre i sidled än
    den lätta; (2) `skjut()` är en impuls, inte en kraft, och en `skjut` per bildruta blev
    en konstant fart som vek ihop kupolen till en trekant; (3) med bara tre fästen
    *roterade* mjukkroppen och kraftfältet drunknade i rörelsen; (4) `form(a)` skalar båda
    axlarna, så en platt underkant drog in skärmkantens hörn till ±11 px.
  - Sonderna: `_fallprobe.mjs` (spelets känsla), `_motstandprobe.mjs` (17/17, utan
    webbläsare), `_kupolprobe.mjs` (6/6 + `--svep`).
  - §4-punkter avbockade ovan: **[Medium] Gör tyngd-valet kännbart** och **[Quick]
    Vind-lut på fallskärmen** (den senare fanns delvis redan; lutningen läses nu ur den
    verkliga relativfarten mot luften i stället för ur vindtalet).
- 2026-10-02 **T3: fast 60 Hz-steg via lib/takt.js — 57 fps-fysiken blir 60 Hz-fysik** (Ä10): luften (`Motstandsvolym.steg`, inkl. styrkraft, no-fail-assist och väggklämman) och kupolens mjukkropp (`falt` + `steg`) stegar nu i en `Takt` med exakt 1 per steg i stället för variabelt `dt` (deltaMS/16,67). Kraft och hjälp läggs in per steg, så ingen kraft ackumuleras över en nollstegs-bildruta. Löven, lutningen, benen och chevronerna är rendering/utjämning och ligger kvar per bildruta med `dt`. Formen flyttar sig lite mot 57 fps-varianten — avsiktligt.
- 2026-10-02 **P1: landningen är en fjäder (`gras.js` → `fjader1d`) i stället för en gsap-tidslinje** (D7 B4).
  - **Före (HEAD, mätt i `scripts/_dag-fallskarm-landa.mjs` §1 med den ordagranna tweenen):** första studsen **72,0 px för alla fallhöjder och båda tyngderna** (spann 0,00 px), ingen inpressning alls, 0,96 s. Tyngd-valet syntes aldrig i landningen.
  - **Nu:** `Gras` (ren modul, ingen Pixi) tar emot nedslagsfarten ur spelets EGEN luft (`_luftRec.vy · 60`). Första slaget = mattan ger en spark (`forstaLast`: golv 0,5 + hoppararens fart / 150 px/s, tak 1), de följande två är hoppararens egen utfart (`passivLast`, retur ≈ 0,69) så studsarna AVTAR. Fjädern är `fjader1d(ω 24, ζ 0,12)`, stegad med en egen `Takt` (fast 1/60 s → identisk kurva 30/57/60/90 fps, mätt 0,00 px spann). Mattan trycks ihop (`_matSq.scale.y`, inre container; måltavlan följer toppen), hoppararen sjunker ≤ ~22 px och kastas upp, skuggan krymper i luften, varje följande nedslag ger en stämd ton (C4→G4, volym ∝ laddning) + lite damm. Boing-klippet vid första nedslaget är oförändrat; det fasta ekot (`delay: 0.54`) är borta — ekot kommer nu ur fjädern.
  - **Mätt (spelets fall, 410 px):** Lätt 85 px/s → 36,5 px studs med golv 0,3 — **höjt till 0,5 efter D7-kritiken (Lätt, förvalet, fick det svagaste anslaget): Lätt ~45 px, webbläsaren 39,8 px** · Tung 142 px/s → 68,2 px, 21,6 px, 1,48 s (HEAD: 72/0/0,96 s för båda). Korta fall (6/14/30 px): Lätt 23→31→35 px, Tung 25→37→49 px — växer med fallhöjden. Byte till Tung SENARE i fallet ger ett mellanvärde (36→45→52→64 px). **Tak:** utfart ≤ 460 px/s → högsta studs ≤ ~70 px (73 med diskretisering) även vid 1 500 px/s; över 300 slumpade landningar lägsta y 492 (fallskärmen startar på 150, aldrig ur bild); alla slutar, ≤ 1,48 s, max 3 nedslag.
  - **Ärlig begränsning:** luften har en gränsfart (~30 px lätt / ~60 px tung räcker), så fallhöjden spelar bara roll för korta fall — i spelets 410 px-fall är det TYNGDEN (och ett tyngdbyte nära marken) som avgör studsen. Premissen "växer med fallhöjden" gäller alltså fysiken, inte det fasta spelfallet.
  - **Återspelssäkert:** fjädern rivs av `_loadLevel` (`_stoppaStuds`) och `destroy`; `_landTl` är borta (inga tweens på `chute.y` kvar); nästa-runda-timern väntar in en fjäder som mot förmodan inte slutat.
  - **Doc-drift (rättas här — FYSIKPLAN är inte min att röra):** FYSIKPLAN §5.6 listar fortfarande `fallskarmen:526→:600` som ett kupolsteg per BILDRUTA (variabelt `dtF`) — det är åtgärdat av T3 (2026-10-02, se loggen ovan: `Takt`, fast steg). P1:s radnummer (`:909-914` landningstweenen, `:922/:958` `_landTl`) är obsoleta efter den här ändringen, och §5.7-raden "landningen en tween → `fjader1d` (P1)" är nu byggd. Sonden ligger i `scripts/_dag-fallskarm-landa.mjs`; `gras.js` exporterar även `START_Y/GROUND_Y/GRAV/V_LATT/MASSA_TUNG` så sond och spel delar konstanterna.
