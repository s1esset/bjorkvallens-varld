# Peka på Kroppen (`peka-pa-kroppen`)
> 🔤 pedagogiskt · tap · 2–5 år · status: ✅ (2026-09-30: Zacke frågar själv, pekar/vinkar/dansar, lekplats, "Vad är det här?")

## 1. Nuläge (sett som spelare)

Zacke — en gosig figur byggd helt av Pixi Graphics — står mitt på en grön äng med
sol, kullar och drivande moln. Uppe till höger en cremebubbla med en emoji för den
efterfrågade delen. Rösten säger "Var är näsan?" (formen varieras: "Kan du peka på…",
"Hitta…", "Visa var… är"). Jag trycker på en kroppsdel → omedelbart ljud + ring.
Rätt del → puls + lysande gul ring + gnistor + delens namn svävar upp ("Näsa!"),
Zacke hoppar och ler stort, och en prick i raden nedtill tänds. Fel del → vänlig
vingel + mjukt ljud, sedan upprepas frågan med en mjuk ledtrådsring. När rundans
mål (3–6 delar) nåtts: glad dans + skak + burst + firande + stjärna + klistermärke,
och Zacke **byter skepnad** (barn → nallebjörn → kanin) till nästa runda.

**Funkar bra:** detta är genomarbetat. Svårighetstrappan är osynlig men smart —
stora delar (mage/huvud/fot/hand) först, sedan ansikts-smådelar (näsa/öga/mun/öra)
och ben/knä, och huvud-zonen krymper till pannan när ansiktet är aktivt så centra
blir entydiga. Figuren andas, blinkar, har rosa kinder; skepnadsbytet ger variation;
idle-recue + ledtråd finns; allt är exit-säkert. Riktigt fin lärlek.

*(Skärmdump: mörkhårig Zacke i röd tröja på äng, prompt-bubbla med ansikts-emoji, 3 prickar.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som lugn **kroppsordförråds**-lek: rösten ber, rätt del lyser
och namnges, fel ger bara en vänlig vink. `highestLevel` styr hur många/finare delar
som efterfrågas och tempot, och figuren byts per runda så det aldrig blir enformigt.
Den uttalade designtanken är "Zacke skrattar glatt" vid rätt — en karaktär att tycka
om. NO-FAIL genom hela spelet; emojin i bubblan ger ett visuellt stöd för den som
inte hör eller inte läser.

## 3. Vad gör det lättjefullt / tunt

- **Bara igenkänning, aldrig produktion.** Barnet pekar när delen *namnges*. Det finns
  ingen "Vad är det här?"-vändning där en del lyser och barnet/föräldern får säga namnet,
  och — viktigast för 2–3-åringar — ingen koppling till **barnets egen kropp** ("Peka på
  DIN näsa!"). Spelet lär ordet på en figur, inte på sig själv.
- **Prompt-emojin matchar inte figuren.** Bubblan visar en generisk emoji (t.ex. en
  blond-hårig 👱-aktig face för "huvud", 🫄 för "mage") som krockar visuellt med den
  mörkhåriga Zacke på skärmen, och flera (mage, knä) är abstrakta. Stödet pekar mot fel bild.
- **"Zacke skrattar glatt" är tyst.** Intentionen i kommentaren är ett skratt, men rätt
  svar ger bara TTS-beröm + en öppen mun-ritning — inget riktigt barn-skratt-klipp, vilket
  är just det ljud som skulle göra karaktären älskvärd.
- **Krympta zoner kan förvirra.** När ansiktet är aktivt blir "huvud" bara pannan (radie 56);
  ett barn som trycker på näsan när du bad om huvudet får "fel"-vingel trots att det pekade
  på huvudet. Pedagogiskt lite hårt för de yngsta.
- **Beröm/fraser är helt TTS** och ljudpaletten tunn ('pling'/'correct'/'soft'). Inga
  riktiga glädje-/skratt-/"pruttkudde"-ljud som barn älskar.
- **Generisk belöning.** Skepnadsbytet är variation, men firandet är samma konfetti+stjärna
  som överallt; ingen kroppsdels-specifik finish.

Kort sagt: en *stark igenkännings-loop med fin karaktär*, men teaching är enkelriktat
(pek-när-namnges), bubbel-stödet är missvisande, och Zackes "skratt" finns bara i texten.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Knyt an till barnets egen kropp.**~~ Redan byggd (varannan fråga, `_ownBody`
  :611 + `_confirmOwnBody`; byggd 2026-07-02, se §5) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Lägg till en "vad är det här?"-vändning.**~~ Klar 2026-09-30: från tredje
  rundan (goal ≥ 4) byts fråga 2 (eller 4) mot "Vad är det här?" — delen lyser, Zacke pekar,
  bubblan visar ett frågetecken; efter 4,4 s (eller ett tryck på den lysande delen) säger
  Zacke "Det är näsan!" och rundan går vidare (`_vad`, `_vadReveal`, `DET_AR`).

### Variation & överraskning
- ✅ ~~**[Quick] Matcha bubbel-emojin till skepnaden**~~ Redan byggd (`KIND_EMOJI` :68; byggd
  2026-07-02, se §5) — uppdagat 2026-09-23.
- **[Quick] Roliga delar ibland:** "Var är svansen?" (på kaninen), "Var är öronen?" stora
  på nallen — utnyttja skepnaderna så delarna känns olika mellan rundor.
  *Blockerad 2026-09-23:* frågorna och berömmet om svansen finns inte som röstklipp (inget
  "svans" i manifestet), och TTS-tjänsten är nere.

### Juice
- ✅ ~~**[Quick] Mildra "huvud"-zonen för de yngsta**~~ Redan byggd (`_softHead` :297 +
  `HEAD_REGION` :95; byggd 2026-07-02, se §5) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Kroppsdels-reaktioner**~~ Klar 2026-09-23 (v1.251.0): varje del har en egen
  stämd tonsignatur i C-dur-pentatonik (`DEL_LJUD` :79 — näsan piper, magen "ho-ho-ho", foten
  en drill, örat ett uppåt-vipp …), spelad efter rätt-ljudet och skrattet; magen skakar och
  foten sprattlar (`_delReaktion` :739).

### Progression
- **[Medium] Mastery-spår:** håll koll på vilka delar barnet ofta missar och ta upp dem
  lite oftare (mjukt), så svåra ord nöts in utan att kännas som ett test.

### Karaktär & berättelse
- ✅ ~~**[Deep] Ge Zacke mer liv som mottagare**~~ Klar 2026-09-30: pekar mot rätt område vid
  tystnad (`_peka`, steg 1; glöd tillkommer vid steg 2), vinkar med vänster arm när han
  frågar (`_vinka`), och egen dans per skepnad (`_finishDance`: barn hurra-hopp, nalle
  magtrumma, kanin skutt med flaxande öron).

### Ljud
- **[Quick] Riktigt barn-skratt + glädje-klipp via SFX-pipelinen** ([[real-audio-sfx]]) vid
  rätt — fullfölj kommentarens "Zacke skrattar glatt". Mjuka kittel/pip-ljud per kroppsdel.
  *2026-09-23:* kittel/pip-ljuden per del är byggda som stämda toner (se Kroppsdels-reaktioner).
  Skrattet är **blockerat** — kroken `audio.sample('skratt')` finns i `_joy` men klippet saknas
  (SFX-pipelinen/MOSS nere).

## 5. Status / loggar

- 2026-09-30 ✅ **Zacke frågar själv, och står någonstans** (arbetsorder 1–5):
  - **Frågebubblan** är Zackes egen pratbubbla bredvid huvudet med svans mot munnen (svansens
    spets står i glappet mellan örat och handen — ingen träffyta täcks). Bilden i den RITAS i
    figurens egna färger (`_partIcon`: fot, hand med tumme, mage, knä, ben, arm, näsa, öra,
    öga, mun, barnets huvud; geometri som `_buildChar`); bara nallens/kaninens huvud lånar
    `drawIcon`. Den guppar med `liv`. (Fixvarv: första versionen gav samma kaninbild för
    huvud/näsa/öra och en hudfärgsfrämmande emoji för övriga delar.)
  - **Fixvarv:** Zacke vinkar bara vid första frågan i rundan (munnen öppnas vid varje fråga);
    i "Vad är det här?" kommer först bara den pekande armen, glöden efter 3 s (`VAD_GLOD`) och
    ordet efter 6,5 s (`VAD_VANTA`); lekplatsens ram är varm orange i stället för himmelsblå.
  - **Zacke som mottagare:** en överlagd arm (rör + hand + pekfinger, rotation runt skuldran;
    den riktiga armen på samma sida göms) pekar mot rätt OMRÅDE vid första tystnaden — glöd
    kommer först vid andra (eller efter ett feltryck), så hjälpen är sen och synlig. Inte för
    arm/hand (armarna ÄR svaret → glöd direkt). Han vinkar när han frågar och öppnar munnen.
    Dans per skepnad ersätter det generiska skalpulsfirandet.
  - **Scen:** lekplats bakom honom (gungställning med gungor på egen fas, rutschkana, sandlåda
    med hink, boll) i dämpade toner under ögonhöjd för huvudet.
  - **Volym:** `sphereFill` (huvud, händer, fötter, öron, hår, mage), `cylinderFill` (armar,
    ben, kaninöron), `topLightFill` (tröjan). Former och träffzoner oförändrade.
  - **"Vad är det här?"** (se §4). Introt sägs nu som eget klipp och frågan väntar in det med
    `ctx.narTyst` (förut en konkatenerad mening som aldrig kunde få ett klipp).
  - Nya repliker (ska in i `voice-phrases.json`): "Vad är det här?" + elva "Det är X!".
  - Exit/återspel: armarnas tidslinjer ligger på armnoden (`_tl`) och dödas av `_clearPoke`
    (anropas av `_clearHint`, före varje rivning och i `destroy`); dansen är en tidslinje
    (`_danceTl`) som dödas vid ny runda och i `destroy`; `liv`-tweens dödas via `_fxLiv`.

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): nästa rundas första fråga kom 1,7 s
  efter `complete()` och kapade skalets beröm — nu byggs figuren genast och frågan väntar in
  rösten via `ctx.narTyst` (utgår om barnet hunnit svara). Varje kroppsdel reagerar med en egen
  tonsignatur; magen skakar, foten sprattlar. §4 stämd mot koden: 3 punkter var redan byggda,
  2 blockerade (röstklipp resp. SFX-klipp).

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] matcha bubbel-emoji + mildra huvud-zonen + riktigt
  skratt-klipp** och **[Medium] "Peka på DIN…"-beat** — störst pedagogiskt/charm-lyft för minst risk.
- 2026-07-02: **Första-omgång implementerad** (self-test errorCount 0).
  - **[Quick] Skepnads-matchande bubbel-emoji:** `KIND_EMOJI` ger nallen 🧸/kaninen 🐰 eget
    huvud (+ 🐻/🐰 för näsa/öra på djuren); barnet behåller 🧒. Stödet pekar nu mot rätt bild.
  - **[Quick] Mildrad huvud-zon:** på låg nivå (`highestLevel ≤ 3`, `_softHead`) godkänns hela
    huvudet även med aktivt ansikte — och ett pek på näsa/öga/mun/öra vid "huvud" räknas som
    huvudet (`HEAD_REGION` i `_onPart`), ingen vingel längre. Beröm/float namnger alltid den
    EFTERFRÅGADE delen (`PARTS[this._target]`), inte det tryckta smådelen.
  - **[Quick] "Zacke skrattar glatt":** ny `_joy()` — `audio.sample('skratt')` om ett riktigt
    skratt-klipp nånsin finns, annars en varm liten hehehe-gigg via `audio.tone` + röst-beröm.
    Spelas vid varje rätt + vid DIN-bekräftelse.
  - **[Medium] "Peka på DIN…"-beat:** varannan fråga (`_step % 2 === 1`) knyter an till barnets
    egna kropp ("Kan du peka på din mage?" / "din"/"ditt" böjt korrekt via `poss`/`bas`). Kort
    paus (`_ownDelay`) → glad bekräftelse OAVSETT (auto-timer eller vilket pek som helst), med
    en glow på samma del hos Zacke som brygga. Alltid firande, aldrig fel.
  - Exit-säkert: `_ownTimer` dödas i `_nextQuestion`/`_clearCharacter`/`destroy`; gigg-tonerna är
    audio-context-schemalagda (inga Pixi-objekt att krascha).
- 2026-08-06: **Röstbugg — åtta repliker kunde aldrig få ett klipp** (🔤 Lära-fliken).
  - `QFORMS`/`OWN_QFORMS` var mallsträngar (`'Var är {d}?'`) som fylldes i med
    `.replace()` vid körning. Klipp-manifestet slår upp på EXAKT text och `check.mjs`
    matchar bara literaler, så alla frågor i spelet — själva kärnan — föll tillbaka på
    Web Speech. Åtta varningar i repo-kontrollen kom härifrån.
  - Ersatta av två uppslagstabeller, `QUESTIONS` och `OWN_QUESTIONS`, med **fyra fulla
    literaler per kroppsdel** (11 delar × 4 × 2 lägen = 88 repliker). Variationen är
    oförändrad; `randomFrom(QUESTIONS[key])` i stället för `randomFrom(QFORMS).replace()`.
  - **Alla 88 fanns redan i `scripts/voice-phrases.json`** — klippen var alltså generade
    hela tiden, det var källkoden som gjorde dem oanträffbara. Repo-varningarna gick från
    11 till 3.
  - Bubbel-emojin (✋/👃/🧸) är kvar: den är en bildledtråd i en stödpanel, inte ett
    spelobjekt — figuren är spelobjektet och den ritas redan.
