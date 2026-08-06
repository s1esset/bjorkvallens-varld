# Peka på Kroppen (`peka-pa-kroppen`)
> 🔤 pedagogiskt · tap · 2–5 år · status: 🔧 förbättringar pågår

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
- **[Medium] Knyt an till barnets egen kropp.** Varannan fråga: "Kan du peka på DIN mage?"
  med en kort paus + glad bekräftelse oavsett (kameran kan inte se barnet — fira alltid).
  Det är den verkliga pedagogiska vinsten för 2–3-åringar och gör leken kroppslig.
- **[Medium] Lägg till en "vad är det här?"-vändning.** Ibland lyser en del upp av sig
  själv och rösten frågar "Vad är det här?" → efter en stund säger den namnet (produktion +
  bekräftelse), så barnet får chansen att säga ordet först.

### Variation & överraskning
- **[Quick] Matcha bubbel-emojin till skepnaden** (eller byt till en liten ritad pil/cirkel
  på figuren) så stödet pekar mot rätt bild — särskilt för nalle/kanin.
- **[Quick] Roliga delar ibland:** "Var är svansen?" (på kaninen), "Var är öronen?" stora
  på nallen — utnyttja skepnaderna så delarna känns olika mellan rundor.

### Juice
- **[Quick] Mildra "huvud"-zonen för de yngsta:** låt hela huvudet (inte bara pannan)
  godkännas på låga nivåer även när ansiktet är aktivt, så ett pek på näsan vid "huvud"
  inte blir en vingel.
- **[Quick] Kroppsdels-reaktioner:** näsan piper, magen skakar/skrattar, foten "kittlar"
  — per-dels-reaktion gör varje rätt unik istället för samma puls+ring.

### Progression
- **[Medium] Mastery-spår:** håll koll på vilka delar barnet ofta missar och ta upp dem
  lite oftare (mjukt), så svåra ord nöts in utan att kännas som ett test.

### Karaktär & berättelse
- **[Deep] Ge Zacke mer liv som mottagare:** han pekar uppmuntrande mot rätt område när du
  tvekar, vinkar mellan rundor, och gör en egen liten dans-finish per skepnad.

### Ljud
- **[Quick] Riktigt barn-skratt + glädje-klipp via SFX-pipelinen** ([[real-audio-sfx]]) vid
  rätt — fullfölj kommentarens "Zacke skrattar glatt". Mjuka kittel/pip-ljud per kroppsdel.

## 5. Status / loggar

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
