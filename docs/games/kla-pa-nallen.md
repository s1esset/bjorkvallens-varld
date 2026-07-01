# Klä på Nallen (`kla-pa-nallen`)
> 🧩 drag · drag · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En mysig, uttrycksfull nalle (ritad i Pixi: mjuk pälston, rosiga kinder, blinkande ögon, glad
mun) står på en levande scen och väntar på kläder. På hyllan längst ner ligger plagg (emoji:
🧢🧣🧥🥾👕👒…). Jag drar — eller tap-tap:ar — ett plagg till rätt kroppsdel; en mjuk ledtråds-ring
markerar varje zon (huvud/hals/mage/tassar/ben/fötter). Rätt plats → plagget snäpper in *i*
nallen, skalas så det passar kroppsdelen (mössan uppe på huvudet, jackan över magen), popp +
gnistor + ring + glad röst ("Mössan sitter!"), kroppsdelen poppar och nallen gör en liten studs.
Fel plats → vänlig vingel + ring + ibland en talad ledtråd ("Mössan ska sitta på huvudet!"),
snäpp tillbaka (aldrig en bestraffning). Hela outfiten på → nallen *snurrar glatt* ett varv,
gnist-svep, delat firande (stjärna + klistermärke) + skakning, sedan en ny runda. Outfit + scen
roterar (vinter/sommar/regn/fin/mys) och antalet plagg växer med nivån (2 → 5). Idle ~6s →
namnger ett kvarvarande plagg + pulsar dess ring.

**Funkar bra:** nallen är genuint gosig och levande (blink, studs, snurr), snäpp-fit:en som
skalar plagget på plats är riktigt fin, scen/outfit-rotationen ger variation, ledtråds-ringarna
gör mål utan läsning, no-fail intakt och tillväxten är mjuk. Charmig och välstädad.

*(Skärmdump: brun nalle med blå keps på huvudet på en äng; en jacka väntar nere till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodens intent: en marknadsmässig påklädningslek där en uttrycksfull, programritad nalle får
kläder dragna till rätt kroppsdel. Påklädning är vardagsmagi som barn älskar att bemästra; rätt
plats → plagget *blir* en del av nallen (skalas/justeras via `WORN`). Outfit + scen roterar
(likt vändkortens SETS) och antalet plagg växer med nivån så det aldrig blir samma två gånger.
Strikt felfritt, allt ritat programmatiskt, all transient-effekt exit-säker via feedback.js.

## 3. Vad gör det lättjefullt / tunt

- **En-utfalls-matchning utan stilval.** Varje plagg har exakt en rätt zon, och bara *ett* plagg
  per zon erbjuds (slumpat ur listan). Barnet *placerar* men *väljer* aldrig — ingen "vill du ha
  kepsen eller solhatten?", ingen färg, ingen smak. Det är ren spatial pussling, inte påklädning
  som uttryck.
- **Emoji-kläder på en ritad nalle krockar i stil.** Den fina vektor-nallen får pålimmade
  emoji-plagg (en keps-emoji på ett ritat huvud). Skalningen hjälper, men stilbrottet syns och
  gör resultatet mindre "klätt" än "klistrat".
- **Inget narrativt utfall — temat är kosmetiskt.** Jag klär nallen i *regnkläder* men det
  regnar aldrig; *vinterkläder* men ingen snö, ingen frusen-sen-varm nalle. "Varför" saknas helt:
  påklädningen leder inte till något i världen.
- **Nallen reagerar tunt på att bli klädd.** En kroppsdels-popp + slutsnurr, men nallen *visar*
  aldrig att den fryser innan och blir varm efter, ler inte extra mot ett favoritplagg, poserar
  inte med solglasögonen. Den är glad hela tiden, oavsett.
- **Inget sparas/visas upp.** Den färdigklädda nallen snurrar och försvinner med rundan — ingen
  spegel, inget "visa upp", ingen garderob/album av outfits man skapat.
- **Ljudet är TTS + generiskt.** 'correct' + talade namn; ingen dragkedja, inget tygprassel,
  ingen "blöt stövel"-plask. Reward är den delade konfettin.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Låt barnet *välja* plagg.** Erbjud 2–3 alternativ per zon (alla "rätt") så barnet
  uttrycker sig — keps *eller* solhatt, röd *eller* blå tröja. Förvandlar en-rätt-svar-pussel
  till verklig påklädning/anpassning, fortfarande no-fail (allt sitter).

### Variation & överraskning
- **[Medium] Narrativt väder-payoff.** När nallen är klädd för regn → det börjar regna och nallen
  står torr och nöjd under paraplyet; vinter → snö faller, nallen blir varm; sommar → solen
  strålar. Knyter ihop *varför* man klär på och belönar valet av rätt outfit.
- **[Quick] Sällsynt rolig accessoar** (fjärilen som landar på hatten, en bubbla) för "wow".

### Juice
- **[Quick] Plagg-specifik SFX** (tygprassel, dragkedja, stövel-plask, "ploj" för rosett) via
  [[real-audio-sfx]] i stället för enbart 'correct'.
- **[Quick] Spegel-/poseringsögonblick** vid varje påsatt plagg: nallen tittar ner och ler, eller
  poserar (solglasögon → cool pose).

### Progression
- **[Medium] Garderob/album.** Spara den färdigklädda nallen som en liten "kort"-bild i en
  garderob som fylls över tur — något att återkomma till och bläddra (talar outfitens namn).

### Karaktär & berättelse
- **[Medium] Nallen *känner* klädseln.** Innan påklädning: huttrar/ser frusen ut (vinter) eller
  fläktar sig (sommar); efter: mysigt nöjd. Ger påklädningen en känslobåge.
- **[Quick] Reaktion per plagg** — kittlas av halsduken, blir pigg av kepsen — så varje del känns.

### Ljud
- **[Quick] Variera beröm-/nalle-fraserna + lugn ambient** så loopen andas.

### Konst
- **[Deep] Rita enkla vektor-plagg** som matchar nallens stil (i stället för emoji) så outfiten
  ser *klädd* ut, inte påklistrad.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan; ersätter äldre build-spec). Inga kodändringar.
  Testkörning ren (errorCount 0), skärmdump verifierad (nalle med keps, jacka på hyllan).
- Rekommenderad första-omgång: **[Medium] välj bland 2–3 plagg per zon + [Medium] väder-payoff
  (regn/snö efter rätt outfit) + [Quick] tyg-/dragkedje-SFX** — ger spelet agens (uttryck) och
  ett *varför* utan att röra no-fail.
- 2026-07-02: **Första-omgång genomförd** — hela rekommendationen byggd + en latent krasch
  lagad:
  - **[Medium] Välj bland 2–3 plagg per zon** (`chosen`/`pool` i `_build`): flera kroppsdelar
    erbjuder nu TVÅ rätta alternativ (keps *eller* solhatt, klänning *eller* skjorta) — barnet
    väljer stil. Total-antalet plagg hålls på budget 6 så hyllan aldrig blir trång, och vilka
    slots som får ett extra val roteras per runda.
  - **[Medium] Väder-payoff** (`_weatherPayoff`/`_fallGlyph` + `WEATHER_SAY`/`WEATHER_GLYPH`):
    när hela outfiten sitter ramlar mjuka väder-glyfer över scenen (❄️ snö, 💧 regn, 🌸 blomblad,
    ✨ sol, 💤 mys) + en talad "därför-klädde-vi-nallen"-fras. Ger påklädningen ett synligt
    *varför*. Glyferna är exit-säkra (proxy-tween, rör Pixi-objektet bara om det lever, städar
    sig själv; delayedCalls i `this._calls` dödas i `_teardown`).
  - **[Quick] Plagg-specifik SFX** (`_garmentSound` + `GARMENT_TONE`): varje kroppsdel får en
    egen mjuk textur-ton ovanpå 'correct' (dragkedja för jackan, "ploj" för halsduken,
    stövel-plopp för fötterna ...), helt via `audio.tone` → inget nytt klipp. **Denna metod var
    anropad men ALDRIG definierad → kraschade vid första rätta placeringen; nu lagad och
    verifierad med drag-test.**
  - **[Quick] Reaktion per plagg** (`REACT_EMOJI`): en plagg-egen reaktions-emoji svävar upp vid
    påklädning (🕶️→😎, 👑→✨, 🎩→🤩 ...) + en liten tyg-`puff` — poserings-ögonblick.
  - Test: `errorCount 0` (statisk + **drag-test som la kepsen på huvudet** → övar `_onCorrect`/
    `_garmentSound` utan krasch); skärmdump bekräftar blå keps på den uttrycksfulla nallen.
  - **Deferred:** [Medium] garderob/album; [Medium] nallen *känner* klädseln (huttrar→nöjd);
    [Deep] handritade vektor-plagg i nallens stil; [Quick] lugn ambient-loop (central hantering).
