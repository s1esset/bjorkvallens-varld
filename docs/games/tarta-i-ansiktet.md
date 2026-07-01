# Tårta i Ansiktet (`tarta-i-ansiktet`)
> 🎉 roligt · mixed · 3–5 år · status: 📝 plan klar

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
- **[Quick] Grädden droppar** sakta nedför ansiktet över tid → levande kladd istället för
  frysta klumpar.

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
