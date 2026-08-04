# SESSIONS.md — sessionslogg

En post per avslutad session, **nyast överst**. Skrivs av `/avsluta`. Syftet: nästa session
(eller nästa person) ska förstå var projektet står utan att läsa chatthistorik eller git-log.

Format:

```
## ÅÅÅÅ-MM-DD · v<version>
**Byggt:** vad som gjordes, i klartext
**Commits:** <hash> <ämne> · <hash> <ämne>
**Öppet:** vad som återstår / nästa naturliga steg
```

---

## 2026-08-04 · v1.7.0

**Byggt:** **Hela ⚙️ Fysik-fliken poleras spel för spel** — alla 27 spel gicks igenom med
`/polera`-kedjan (läs doc §3/§4 → skärmdump som spelare → bygg → `check` → `test` → commit
→ doc §5). En commit per spel.

- **P0 ASSETS var den genomgående skulden.** 20 av 27 spel hade emoji som HELA spelobjekt,
  ofta i en ruta eller cirkel — precis det regeln förbjuder. Nu ritas bl.a. 16 flyt/sjunk-
  föremål (`plask-i-vattnet`), 6 frukter (`fanga-frukten`), 5 byten (`spindelnatet`), tre
  bollar med eget ansikte (`rulla-bollen-hem`), bowlingkäglor (🎳-emojin visade en boll OCH
  käglor i varje "kägla"), grävmaskin + dumper + Zacke i hytten (`gravmaskinen`), kanin,
  groda, kattungar, ekorre, djuransikten per art, penna, mål, vikter, ikoner och mätardetaljer.
- **Fyra spel fick en mottagare** (gate-punkt 4): Bobo på ängen (`poppa-ballonger`), målvakten
  i målet (`rulla-bollen-hem`), Bobo vid korgen (`studsbollar`) och fickor med ansikte som
  gapar hungrigt (`studsa-ner`). Fem spel fick Bobo en **kropp** — han var ett svävande huvud.
- **Tre spel fick ett nytt syfte:** kattungen som ska räddas ner för tornet (`bygg-tornet`),
  den hungriga ekorren som önskar sig en fruktsort (`fanga-frukten`), och — störst —
  **`spara-linjen` där prickarna nu bildar en BILD**: åtta motiv (berg, hus, moln, fisk,
  hjärta, katt, stjärna, blomma) som fylls med färg, får ögon och ett leende när linjen sluts.
- **Progression som består:** gömda kompisar i ballongerna, vänbok över klappade arter,
  skyline av byggda torn, myntkruka, hål-rad, upptäckts-logg — allt sparat i `custom`.
- **Sex layout-/synlighetsbuggar** hittade i skärmdumpsgranskningen som gröna tester aldrig
  ser: mätaren under ljudknappen (`studsa-ner`), mätaren bakom avsatsen + oläsbara etiketter
  (`knuffa-tornet`), knapp klippt av nederkanten (`rulla-bollen-hem`, `fallskarmen`), tom
  vikt-ikon tills första trycket (`fallskarmen`), enhörningen vänd bakåt (`enhorningen-flyger`),
  upp-och-nedvänd kanin (`studsmatta`), och `floatText` som skrev ut ordet "gem" över scenen
  (`enhorningen-elvira`).
- **Kodbuggar:** ~15 `gsap.delayedCall` → `ctx.later()`; `_calls` som växte obegränsat under
  en lång session (`klappa-mullvaden`); oändliga tweens mot Pixi-objekt som kan förstöras
  (proxy-mönstret); tre konkatenerade röstrepliker som `check.mjs` aldrig kunde hitta och
  `/rost` därför aldrig kunde klippa.
- **Scener:** 12 spel fick en riktig plats i stället för tapet — staket, träd, vimplar,
  fotbollsplan med linjer, byggarbetsplats, glasskiosk, lekplats, snödrivor, ängsdekor.

**Commits:** `76d591e` poppa-ballonger · `291a5fc` klappa-mullvaden · `a3552b4` plask-i-vattnet ·
`1e08672` bygg-tornet · `18741d5` rulla-bollen-hem · `eec5eba` spara-linjen · `b62fb42` studsbollar ·
`60ee318` studsa-ner · `c860c6f` fanga-frukten · `a50464e` vippbradan · `310cf20` domino ·
`a7d44c2` studsmatta · `aac5fe5` knuffa-tornet · `b13e5de` spindelhjalten · `1409056` enhorningen-elvira ·
`72ba7b2` valpens-bajs · `bca8995` tvatta-djuret · `3356281` gungan · `86b557c` spindelnatet ·
`3af8567` fallskarmen · `4c145f6` enhorningen-flyger · `56cdfc7` spindel-zacke-svingar ·
`8e179cb` bowling · `3337304` flipperspel · `34b8cbe` snobollen · `b239f4f` glasstornet ·
`9e8dc5a` gravmaskinen
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `npm run test:fx` grön.
**Öppet:** 136 repliker väntar på klipp (`/rost`) — 83 nya från den här omgången. Nio spel
markerade ✅ i indexet (hel omgång: mottagare + assets + variation); de övriga 18 fick
assets-/scen-/buggrundor och står kvar som 🔧 med kvarvarande [Deep]-punkter i sin doc §4
(bl.a. riktiga SFX-klipp, mjukare auto-hjälp i några spel, och samlingar som består).

**➡️ NÄSTA SESSION:** samma omgång ska köras för de tre återstående flikarna —
🎉 Roligt (14) → 🧩 Pussel (19) → 🔤 Lära (9) = **42 spel kvar av 70**.
Metod, de fem läckorna, verktyg och en **ordnad kö sorterad efter uppmätt asset-skuld**
ligger i **`docs/POLERINGSRUNDA.md`**. En checkpoint i `.claude/state/korning.json` gör att
SessionStart-hooken lyfter det automatiskt — kör **`/aterta`** för att fortsätta.
Kö 2 (Pussel) är märkt ✅ i indexet, men den bedömningen gjordes 2026-07-02, **innan P0-regeln
`ASSETS` fanns** (2026-07-25) — skulden är uppmätt och verklig, så kör dem ändå.

---

## 2026-07-25 · v1.4.0

**Byggt:** Ägarens speltest-runda: en ny P0-regel, **två systemiska buggar i delad kod**, och
sju spel åtgärdade av fem parallella agenter.

- **Ny P0-regel `ASSETS`** — spelobjekt ritas fristående med egen silhuett och eget liv;
  aldrig en emoji i en ruta eller bricka. Kort och paneler är för text och UI. Inskriven i
  `CLAUDE.md`, `docs/DESIGN.md §8.1`, kvalitetsgrinden (punkt 8), skill `spelkontrakt` och
  båda bygg-/kritiker-agenterna. Heuristik: 22 av 70 spel har kvarvarande skuld (ej åtgärdad).
- **Systemisk bugg 1 — objekt växte vid upprepade tryck.** `pop()` läste sitt eget pågående
  läge som bas → 1.18, 1.39, 1.64 … utan tak. Samma felklass i `wiggle` och `shake`.
  `pop()` används i **64 av 70 spel, 291 ställen**. Första fixen räckte inte (4.11× kvar på
  12 tryck) — `gsap.killTweensOf()` dödar timelinens barn-tweens men inte timelinen, vars
  `onComplete` nollställde flaggan mitt i nästa puls. Nytt regressionstest `npm run test:fx`.
- **Systemisk bugg 2 — fördröjda anrop läckte mellan spelomgångar.** Modulerna är singletons,
  så en `gsap.delayedCall` överlever `destroy`; vid nästa start är `_alive` åter `true` och
  vakten släpper igenom den gamla callbacken. **69 av 70 spel** använder `delayedCall`.
  Nytt `ctx.later(sekunder, fn)` i `GameHost` knyter fördröjda anrop till spelomgången.
- **Sju spel:** `zackes-biltvatt` (tvåfas-loop svamp→skum→slang, skrubbmotstånd, verlet-slang
  från hydrant, fristående objekt) · `domino` (snäppet returnerade **alltid `null`** pga `NaN`
  i avståndet — ingen bricka har någonsin kunnat fastna; + regnbågsgradient styr placeringen) ·
  `siffertaget` (tåget backade iväg; sättet ompositionerat) · `flipperspel` (`Body.setAngle`
  roterade kring masscentrum → 30–90 px paddeldrift; kulan nådde dessutom aldrig ner till
  paddlarna; +42 % bordsbredd) · `snobollen` (banan var **matematiskt omöjlig** att klara —
  uppmätt x=656 mot mål 1085; hindren välter nu) · `glasstornet` (körsbäret och pendeln hade
  ingen begriplig roll — nu mål respektive vind; layout rättad) · `glittergrottan`
  (teknikdemo → ordningsspel med sex regler och facit-rad).
- **`check.mjs`** hittade inte repliker som ligger i konstant-banker → 199 saknade repliker
  upptäckta mot tidigare 50 (189 efter att speltitlar undantagits).

**Commits:** `80a4a6d` lib-fixar · `4e03f80` ASSETS-regel · `839abd0` check · `54431b9`
biltvätt · `c92f751` domino · `6c31558` siffertåget · `e58ec67` flipper · `09bcead` snöbollen ·
`8effc24` glasstornet · `623ed87` glittergrottan · `a6ac26a` röst
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `npm run test:fx`
grön · bygge rent.
**Öppet:** 189 repliker väntar på klipp (`/rost`). ASSETS-skulden i 22 spel. Retroanpassning
av `ctx.later()` i de 69 spel som fortfarande använder `delayedCall` direkt. Snöbollens banor
är nu snabba (~2 s för en van spelare), och `glittergrottan` hör mekaniskt hemma i
Pussel-fliken snarare än Roligt.

---

## 2026-07-25 · v1.3.0

**Byggt:** **Zackes Biltvätt** (`zackes-biltvatt`, 70:e spelet) — pipelinens första skarpa
körning — plus en **lättad P0-regel om motgång**.

- **Regeländring (ägarbeslut):** motgång var tidigare i praktiken förbjuden
  (`FEEDBACK = … ENDAST positivt`). Nu finns en egen P0-rad **`MOTGÅNG`**: hinder och bakslag
  är tillåtna och önskvärda, ska gå att anpassa sig runt, som mest sakta ner, och måste ha ett
  **tak** + lagom takt. Fortfarande förbjudet: misslyckande som avslutar/nollställer,
  "game over", sjunkande poäng, bestraffande timers. Uppdaterad på 11 ställen (CLAUDE.md,
  skills, agenter, README, ARCHITECTURE, PIPELINE, docs/games/README). `spelkritiker` flaggar
  numera även **för lite** motstånd.
- **Spelet:** två verktyg med olika styrka (svamp skrubbar tjockt, slang sköljer brett och
  skrämmer bort fåglar innan de bajsar) → ett äkta val. Tak: max 3 bajsfläckar samtidigt,
  därefter missar fåglarna. 6 fordon, 4 fågeltyper + sällsynt regnbågsfågel. Finish: glans-svep,
  tvåtons-tuta, ägaren jublar och åker med ut genom glansbågen; pentatonisk ton per ren fläck.
- **Pipelinen fungerade.** `spelkritiker` hittade två äkta blockerare som jag missat: slangens
  syfte var oupptäckbart (tipset kom först *efter* en lyckad träff), och `progress.complete()`
  klippte den spelspecifika slutrepliken (`voice.say` anropar alltid `cancel()`). Skärmdumps-
  granskningen fångade tre visuella buggar som ett grönt test aldrig sett: streck över Zackes
  ansikte (`.arc()` i delad Graphics), svävande ägare, fläckar utanför karossen.
- **Bugg i leveranssteget hittad och fixad:** `scripts/start.ps1` + `stop.ps1` var UTF-8 **utan
  BOM** med å/ä/ö → Windows PowerShell 5.1 (som `npm run serve` startar) läste dem som ANSI och
  gav parse-fel. BOM tillagd; `npm run serve` fungerar igen. `scripts/backup.ps1` skrevs
  ASCII-rent av samma skäl.

**Commits:** `b903562` feat(zackes-biltvatt) · `d610505` feat(pipeline)
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · bygge rent · serverad
på :4173 (Tailscale 8445).
**Öppet:** 8 nya repliker väntar på röstklipp (`/rost` när narratorn är uppe). Fågelljuden lånar
fel djur (`djur_hona/uggla/anka/tupp`) tills MOSS kan generera riktiga mås/gås-läten.

---

## 2026-07-25 · v1.2.0

**Byggt:** Projektet fick en riktig pipeline. Kunskapen som tidigare låg som prosa i en
261-raders `CLAUDE.md` (och i minnesfiler) är nu **körbara verktyg och laddas-vid-behov-skills**.

- **`CLAUDE.md` 261 → 59 rader** — bara P0-reglerna, kommandoytan och en routingtabell.
  Allt djup flyttat till fem nya skills: `spelkontrakt`, `spel-pipeline`, `fysik-spel`,
  `ljud-och-rost`, `skal-och-data` (plus de befintliga `threejs-*`).
- **8 svenska slash-kommandon** — `/spel` `/polera` `/felsok` `/fixa` `/testa` `/rost`
  `/avsluta` `/aterta`.
- **3 subagenter** — `spelbyggare` (bygger en slice), `spelkritiker` (spelar som 3-åring,
  kvalitetsgrind), `felsokare` (buggjakt med adversariell verifiering).
- **`npm run check`** (`scripts/check.mjs`) — validerar kontrakt, registret åt båda hållen,
  P0-brott, docs och röst-täckning. Strikt läge per spel. Hittade 52 verkliga varningar:
  50 repliker som aldrig kan få ett röstklipp + 2 spel utan `voiceIntro`.
- **`npm run test` / `test:all`** (`scripts/test-games.mjs`) — parallell headless-körning över
  ett/flera/alla spel, med automatiska musdrag för dragspel. **Baslinje: 69/69 gröna.**
- **Krasch-återhämtning** — `.claude/state/korning.json` (checkpoint före varje steg) +
  `scripts/session-start.mjs` som lyfter avbrutna körningar vid sessionsstart + `/aterta`
  som verifierar mot disken innan den fortsätter.
- **`npm run backup`** — robocopy-spegel till `E:\backup\pwagames` (inkl. `.git`, exkl.
  `node_modules`/`dist`). Hoppar tyst över om disken saknas.
- **Docs:** `docs/PIPELINE.md` (människoläsbar pipeline), den här loggen,
  `docs/games/_MALL.md` (spec-mall), omskriven `README.md`, `ARCHITECTURE.md` trimmad till
  levande beslut med forskningen arkiverad i `docs/arkiv/`.

**Öppet:**
- 50 röstrepliker saknas i `scripts/voice-phrases.json` → kör `/rost` när narratorn är uppe.
- 2 spel saknar `voiceIntro` (`npm run check` pekar ut dem).
- Pipelinen är byggd men ännu inte körd skarpt — första riktiga testet är nästa `/spel`.
