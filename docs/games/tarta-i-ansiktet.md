# Tårta i Ansiktet (`tarta-i-ansiktet`)
> 🎉 roligt · mixed · 3–5 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

Alissa — en stor, glad clown (rött hår/öron, röd näsa, fest-hatt, brett leende) — står på
en scen med röda ridåer. Längst ner väntar en gräddtårta på en bricka. Jag GREPPAR tårtan,
drar och SLÄPPER med fart (flick); den flyger i en fysik-båge (gravitation + mjuk styrning
mot ansiktet) och PLASKAR: 3–5 vita grädde-klumpar studsar fram på ansiktet, en vit puff,
clownen vinglar + studsar, rösten ropar något busigt ("Plask!", "Mums!", "Oj då!"). En
prickrad fylls per tårta. När ansiktet blivit kladdigt dyker en SVAMP upp nere till höger:
jag drar svampen fram och tillbaka över ansiktet och grädden skrubbas bort där den gnuggar,
tills ansiktet är rent (mjukt "pling" + gnistor). Efter rundans tårtor → firande + stjärna +
klistermärke, en extra skvätt grädde som guldkant, och en ny fräsch runda.

No-fail är ordentligt genomtänkt: en svag flick får mjuk auto-hjälp, ren tryckning på tårtan
*eller* på clownen auto-kastar, ett släpp långt bredvid vinglar och snäpper tillbaka, och vid
idle börjar svampen auto-torka en klump så det aldrig kan låsa sig. Två leksaker i en: kasta-
kladda och torka-rent.

**Funkar bra:** flick-fysiken känns rolig och "kasta" är intuitivt, splat-ögonblicket är
tillfredsställande, svamp-skrubbningen är en genuint annorlunda andra-mekanik, och no-fail-
hjälpen är osynligt generös. En polerad slapstick-loop.

*(Skärmdump: clownen Alissa med grädde över nosen, fest-hatt, svamp nere till höger, konfetti.)*

## 2. Ursprunglig plan & tankeprocess

Kodens header: "ren slapstick-glädje (3–5 år)". Idén är den tillåtna busigheten — att få
kasta tårta i ansiktet på någon är förbjuden-rolig för en 4-åring — paketerad helt no-fail
med en lugnande motpol (torka rent) så leken har både kaos och ordning. Flicken ger äldre barn
en motorisk gest medan tap-fallback + auto-styrning gör att de minsta alltid träffar. Den
depicterade människan heter Alissa enligt namnreglerna.

## 3. Vad gör det lättjefullt / tunt

Loopen är stark, men slapstickens själva poäng underutnyttjas:

- **Offret reagerar inte.** Alissa har EN min — samma breda leende — vare sig hon är ren eller
  helt täckt av grädde. Hon blinkar inte, följer inte tårtan med blicken, blir aldrig förvånad,
  kisar aldrig, skrattar aldrig till. Ett slapstickspel där den träffade har ett fruset ansikte
  tappar 80 % av komiken. Hela reaktionen är `wiggle` + `pop`.
- **Auto-styrningen äter upp siktet.** `_stepFlight` drar tårtan mot ansiktets mitt oavsett hur
  jag kastar — en flick upp-vänster kröker ändå till samma punkt. "Dra och flicka" har därför
  nästan noll skicklighetsuttryck; det blir i praktiken ett tap. Jag kan inte sikta på hatten,
  nosen, eller missa på skoj.
- **En enda projektil, en enda splat.** Alltid samma gräddtårta, alltid vita cirkel-klumpar i
  samma slumpkluster. Ingen variation (choklad, bär, vaniljkräm, vattenballong), ingen
  splat-form utöver cirklar. Träff nummer sex ser likadan ut som träff nummer ett.
- **Tom scen.** Clownen står ensam mellan två röda ridå-rektanglar. Ingen publik, ingen
  medspelare, ingen uppbyggnad — slapstick utan reaktion *runt omkring* känns platt.
- **Torkningen är mekanisk.** Klumparna krymper/tonar bort under svampen — skönt, men ingen
  squeegee-strimma, inga tvål-bubblor, ingen blank "ren"-glans som följer svampen.
- **Tunt, generiskt ljud.** `pop`/`pling`/`whoosh`/`soft` + talade splat-ord. Inget riktigt
  "squelch/plask", ingen komisk boing, inget gnissel när man torkar.

Kort sagt: mekaniken är gedigen men **slapsticken är enkelriktad** — Alissa är ett orörligt mål,
inte en medspelare, och flicken har inget att sikta på.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Reaktivt ansikte.** Vid träff: ögonen knips, munnen blir ett förvånat "O", hon
  blinkar bort grädde, kikar fram mellan klumparna. Ögonen FÖLJER tårtan under flygningen.
  Detta är det enskilt största komiska lyftet och rör inte fysiken.
- **[Deep] Låt siktet betyda något (fortsatt no-fail).** Dämpa auto-styrningen så flick-
  riktningen avgör var den landar; missar plaskar på ridån/hatten med ett roligt ljud
  (aldrig "fel"), och olika träffpunkter belönas: nosen → tut, hatten → den snurrar av.

### Variation & överraskning
- **[Medium] Fler kastobjekt** som roterar per runda — gräddpaj, gul vaniljkräm, rosa bär,
  vattenballong (blöter, kräver annan torkning). [Quick] varierad splat-färg och -form.
- ✅ ~~**[Quick] Grädden droppar**~~ Klar 2026-08-12 (v1.171.0) — med ett TAK, så kladdet aldrig
  blir ett mål som flyr undan svampen. Se §5.

### Juice
- **[Quick] Riktiga SFX:** squelch/plask vid träff + komisk boing, mikroskak på skärmen
  skalad efter träffen. Inspelat fniss istället för TTS-ord.
- **[Quick] Skrubb-känsla:** svampen lämnar en blank, ren strimma + några tvålbubblor medan
  den gnuggar, och ett mjukt gnissel-ljud.

### Progression
- **[Medium] Skrattande publik.** Små ansikten i kanten som fnissar/jublar mer ju kladdigare
  Alissa blir och kastar konfetti vid rundans slut — ger slapsticken en medskrattande omgivning.

### Karaktär & berättelse
- **[Medium] Alissa "svarar".** Busiga repliker med matchande ansiktsanimation ("Hihi, en till!"),
  och hon duckar ibland på skoj (träffas ändå — no-fail) så hon känns som en lekkamrat.

### Ljud
- **[Quick] Dedikerade plask/skratt-klipp** ersätter de talade orden; lugn cirkus-ambient.

## 5. Status / loggar

- 2026-08-12 🍰 **Grädden rinner** (v1.171.0, N10 pass 7). Klumparna satt frusna exakt där de
  träffade: sex tårtor gav sex stillastående cirkelhögar. Nu har varje klump en egen fart, ett
  eget tak och ett **spår** — en kapsel som ligger kvar vid träffpunkten medan klumpen glider.
  En stor klump rinner längre än en liten prick (det är massan man ser), farten avtar
  exponentiellt mot taket, och taket klamras dessutom mot HAKAN så ingen grädde rinner ut ur
  ansiktet.
  **Taket är designen, inte en detalj.** Grädde som rinner obehindrat blir ett mål som flyr
  undan svampen — barnet hade jagat kladdet i stället för att torka det. Torkningen läser
  klumpens LEVANDE läge (`_rub` prövar mot `blob.x/blob.y` varje gnugg), så rinnandet gör
  aldrig en klump omöjlig att träffa.
  **MÄTT** (`scripts/_dropprobe.mjs`, 7/7 mot HEADs 2/7): 7–9 klumpar rinner 36,6–51,3 px
  (HEAD **0,0 px** för alla) · små klumpar 39,6 px mot stora 45,2 px · **0** klumpar passerar
  sitt eget tak · lägsta klump y = 105,0 mot hakans 105 · strimma 81,7 px · `_clean`
  0,00 → 0,72 när svampen hålls där klumpen är NU · 0 konsolfel.
  ⚠️ **Formen krävde två omtag som BARA skärmdumpen såg — alla sju tal var gröna i båda.**
  ⓵ Utan kontur smälter strimman ihop med klumpen och med det ljusa ansiktet: 46 px uppmätt
  strimma, osynlig i bild. ⓶ En avsmalnande KIL med rak ovankant läser som en **tratt som står
  ovanpå** klumpen, inte som något som runnit ur den. En **kapsel** (rundad topp, jämn bredd,
  hörnradie = halva bredden) läser rätt.
  ⚠️ HEAD-armens rad 3 var först grön på ett spel utan mekanik: `d > NaN` är alltid falskt.
  Sonden felar nu explicit när taket inte går att utvärdera.


- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`0e75b57`, v1.104.0).
  `_plattprobe --medbakgrund` mätte **407 401 px = 44 % av skärmen** i EN ton.
  Tonen var `COLORS.bg`, alltså samma letterbox-fälla som `vart-tog-det-vagen`.
  Cirkusfonden är nu ljusast där rampljuset träffar och mörknar mot golvet; scengolvet
  tonades i samma svep (det blev bildens största fält på 122 303 px så fort fonden lyftes).
  **Ridån var det verkliga fyndet:** efter fonden låg dess röda på 140 439 px (15 %) i två
  platta toner. Varje veck ÄR ett stående tygrör, så de fylls med `cylinderFill` — ljus längs
  mittlinjen, mörker mot båda kanterna. Cachad per färg: tolv veck kostar två gradienter.
  Lärdom: att bara fixa bakgrunden hade INTE stängt punkten här.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **407 401 → 46 957 px** (44 % → 5,1 %).

- 2026-06-30: Doc skriven (ersätter den gamla bygg-specen med en spelar-granskning).
  Speltestad (errorCount 0, skärmdump granskad — Alissa med grädde + svamp). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] reaktivt ansikte + [Quick] riktiga plask-SFX** — gör
  Alissa till en medspelare och får slapsticken att landa. Siktet (Deep) kan vänta.
- 2026-07-01 🔧 **Första-omgången byggd:** (1) **Reaktivt ansikte [Medium]** — ansiktet
  refaktorerat till separata delar: ögon med rörliga pupiller (`_makeClownEye`) som FÖLJER
  tårtan under flygningen (`_lookAt` i `_stepFlight`), knips ihop + munnen blir ett förvånat "O"
  vid träff (`_faceSplat`), och en lugn idle-blink (`_scheduleBlink`). (2) **Plask-ljud [Quick]** —
  synt-"squelch" nedåt + komisk boing via `audio.tone()`, med `audio.sample('plask')`-hook som
  spelar riktiga klipp när MOSS ([[real-audio-sfx]], #3) kört. Städning: oanvänd `ctx`-param bort
  ur `_onCakeMove`. Siktet (Deep) lämnat till senare. Verifierat: flick → splat → reaktivt
  ansikte + svamp, errorCount 0.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).**
  - **"Tom scen. Clownen står ensam mellan två röda ridå-rektanglar."** De platta röda
    rektanglarna läste som en trasig ram, inte som en scen. Nu riktiga ridåer med veck och
    guldsnodd, en kappa med tofsar längs överkanten och ett plankgolv.
  - **Publik:** Bobo och Zacke står på scengolvet och **hoppar till av skratt** varje gång
    tårtan landar. Slapstick utan reaktion runt omkring kändes platt.
  - **"En enda projektil, en enda splat":** fyra tårtsorter (grädde, choklad, blåbär, jordgubb)
    roterar mellan kasten, och **splat-klumparna får sortens färg** — träff sex ser inte längre
    likadan ut som träff ett.
  - **Läcka #6 (latent):** `_drawClownMouthOn` körde `.arc()` direkt efter `.clear()`, vilket
    fyller en kil från (0,0) till bågens start. Den råkade döljas av näscirkeln som ritas efter.
    Fixad med `moveTo` till bågens startpunkt.
  - **Grind:** `npm run check --game tarta-i-ansiktet` 0 fel · `npm run test` grönt ·
    `_idleprobe 20s` → `idleFramsteg: 0`, `efterSpel: 2`. 2 nya repliker väntar på röstklipp.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): ridå/scengolv/kappa breddade med raka flikar utanför 16:9 — synliga veck 0..720 orörda. Testad båda viewports: 0 fel.
