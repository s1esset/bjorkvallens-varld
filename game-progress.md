# 🚧 AKTIV: Byggplan 2 — 25 NYA spel (vågen efter de 41 första)

Mål: 25 helt nya, mer polerade spel med bättre fysik & mer spelarpåverkan. Plan: `docs/PLAN-2.md`.
Specar: `docs/games/<id>.md`. 1 spel/fas (färsk session) → bygg → simplify → test → fix → commit.
Status: ⬜ ej påbörjad · 🟦 spec klar · 🟨 byggs/testas · ✅ klar.

**Klara: 8 / 25**

| # | id | Titel | Spec | Bygg | Simplify | Test | Commit | Anteckningar |
|---|----|-------|:----:|:----:|:--------:|:----:|:------:|--------------|
| 1 | `regnbagsmalaren` | Regnbågsmålaren Elvira | ✅ | ✅ | ✅ | ✅ | ✅ | Svep målar 6 bågar (snäpp ≥90%), färgburk-val, tap-tap-fallback, dubbel-regnbåge L2, sol+blommor-firande; 0 fel |
| 2 | `pruttbad` | Pruttbubbelbad | ✅ | ✅ | ✅ | ✅ | ✅ | Tryck/håll mage→prutt-bubblor (buoyancy-integrator), dra anka deflekterar, skum fyller mot mållinje; 0 fel |
| 3 | `valpens-bajs` | Valpens Bajs | ✅ | ✅ | ✅ | ✅ | ✅ | Tap-to-walk valp bajsar, dra skyffel→tunna (tap-fallback), flugor dekorativa, mätare; 0 fel |
| 4 | `enhorning-glitterbajs` | Enhörningens Glitterbajs | ✅ | ✅ | ✅ | ✅ | ✅ | Mata enhörning→matter.js glitterpellets studsar, dra skattkista fångar; gravityY 1.0, bend-auto-hjälp; 0 fel |
| 5 | `tvatta-djuret` | Tvätta Djuret | ✅ | ✅ | ✅ | ✅ | ✅ | Dra svamp→sudda lera (avtäck päls+skum), dra dusch→skölj; rutnäts-täckning, no-fail auto-clean; 0 fel |
| 6 | `ballonglyft` | Ballonglyft | ✅ | ✅ | ✅ | ✅ | ✅ | Tryck→fäst ballonger (räkning), sväv present till Elviras fönster, poppa finjusterar; damp-spring 1D, auto-hjälp; 0 fel |
| 7 | `gungan` | Gungan | ✅ | ✅ | ✅ | ✅ | ✅ | Tryck i takt→pendel-resonans pumpar Lova till fågeln; 💪-toggle + svep-knuff; auto-assist vid vändpunkt; 0 fel |
| 8 | `lagerelden` | Lägerelden | ✅ | ✅ | ✅ | ✅ | ✅ | Dra ved + svep bälg→eld-partiklar växer (heat=fuel+air), dra marshmallow→gyllene; aldrig brinner upp; 0 fel |
| 9 | `spindelnatet` | Spindelnätet | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 10 | `magnet-fiske` | Magnetfiske | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 11 | `fallskarmen` | Fallskärmen | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 12 | `enhorningen-flyger` | Enhörningen Flyger | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 13 | `spindel-zacke-svingar` | Spindel-Zacke Svingar | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 14 | `bowling` | Bobos Bowling | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 15 | `flipperspel` | Flipperspel | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 16 | `kulbana` | Kulbanan | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 17 | `snobollen` | Snöbollen | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 18 | `glasstornet` | Glasstornet | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 19 | `golvet-ar-lava` | Golvet är Lava | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 20 | `vattenvagen` | Vattenvägen | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 21 | `blixt-och-dunder` | Blixt och Dunder | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 22 | `kugghjulen` | Kugghjulen | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 23 | `gravmaskinen` | Grävmaskinen | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 24 | `trollblandning` | Trollkarlens Blandning | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |
| 25 | `loopdjuren` | Loopdjuren | 🟦 | ⬜ | ⬜ | ⬜ | ⬜ | |

## Byggplan-2-logg
- **#8 lagerelden** ✅: Byggd (fräsch agent, egen eld-partikel-integrator heat=BASE+fuel·0.12+air·0.5) + simplify-agent (inga ändringar — ren) + headless-test 0 fel (ved-drag + marshmallow-drag + bälg). Marshmallow tonar vit→gyllene (lerpColor), aldrig svart; air/fuel klampas + BASE_FUEL-golv = brinner aldrig upp/ut; idle-gust + boost = no-fail. Ved via DragController, marshmallow/bälg egen drag. Röstrader (batchas): voiceIntro / "Mer ved gör elden stor!" / "Blås på elden..." / "Gyllene och god! Smaskigt!". Committad.
- **#7 gungan** ✅: Byggd (fräsch agent, egen pendel-integrator OMEGA0=2.5/DAMP=0.22/THETA_MAX=1.45) + simplify-agent (inga ändringar — redan ren, importerade bara använt) + headless-test 0 fel (broad taps pumpar). Fas-kvalitet q styr stigning (golv 0.35=aldrig broms), 💪-toggle ×1.8, svep-knuff; auto-push vid vändpunkt garanterar mål. Röstrader (batchas): voiceIntro / "Just så — tryck i takt!" / "Nu knuffar vi starkare!". Committad.
- **#6 ballonglyft** ✅: Byggd (fräsch agent, egen 1D damp-spring-integrator K=0.018/DAMP=0.9) + simplify-agent (döda imports PRAISE/randomFrom) + headless-test 0 fel (broad taps). Mål-höjdfönster + dwell 700ms; auto-hjälp lägger till/poppar ballong = no-fail konvergens. Räknar högt (en..nio). Röstrader (batchas): voiceIntro / tal en–nio / "Vi provar en ballong till!" / "Vi poppar en ballong." NOTERA: build-agenter importerar ofta oanvända PRAISE/randomFrom → be dem låta bli.
- **#5 tvatta-djuret** ✅: Byggd (fräsch agent, egen lera-rutnäts-mask) + simplify-agent (extraherade `_fadeOut`-hjälpare, ~36→22 rader) + headless-test 0 fel (svamp- + dusch-drag). Två verktyg krävs mekaniskt (skum ≤ skrubbat); idle + no-progress-auto-clean konvergerar till 100%. Röstrader (batchas): voiceIntro / "Så ja, gnugga gnugga!" / "Bra! Ta duschen och skölj." / "Skölj rent!". Committad.
- **#4 enhorning-glitterbajs** ✅: Byggd (fräsch agent, matter.js PhysicsWorld) + simplify-agent (tog bort dött `emoji`-fält) + headless-test 0 fel (mata-drag + kist-drag). Calib: gravityY 1.0, MAX_FALL 11, ramp restitution 0.5, pellets bouncy 0.86, nivå-beroende bend mot kistan + auto-glid = no-fail. Röstrader (batchas): voiceIntro / "Pruttbajs! Massa glitter!" / "Mer glitter!". Committad.
- **#3 valpens-bajs** ✅: Byggd (fräsch agent, mixed input) + inline-simplify (tog bort döda imports `PRAISE`/`randomFrom`; extraherade `_scheduleFlies` delad av spawn + släpp-tillbaka) + headless-test 0 fel (skyffel-drag + gå-taps). Egen skyffel-drag (fri placering) m. tap-fallback; auto-vandring+auto-skyffel garanterar full tunna. Röstrader (batchas): voiceIntro / "Skyffla bajset i tunnan!" / "Hurra! Parken är ren!". Committad.
- **#2 pruttbad** ✅: Byggd (fräsch agent) + inline-simplify (extraherade `_pushBubble` delad av `_spawnBubble` + firande-svärm; flyttade redundant foam-tilldelning ur loop) + headless-test 0 fel (anka-drag + mage-tryck, exit-cykel). Agent-avvikelse: DragController stödjer ej fri placering → egen anka-drag m. tap-tap (matchar spec-avsikt). Röstrader (batchas): "Tryck på Zackes mage så pruttar det bubblor!" / "Pruttbubblor!". Committad.
- **#1 regnbagsmalaren** ✅: Byggd (fräsch agent) + simplify (dedup arc-ritning, kollapsad unicorn-move) + headless-test 0 fel (svep målar bågarna, snäpp, exit-cykel). Röstrader (batchas till `npm run voice` sen): "Måla en regnbåge! Dra fingret över himlen." / "Så fint!" / "En till färg!" / "Titta vad fin!". Committad.
- 2026-06-29: `docs/PLAN-2.md` + denna tracker skapade. 25 koncept låsta (teman: element, bajs/kiss, spindel, enhörning; namn Zacke/Elvira/Alissa/Lova). Nästa: skriv 25 byggspecar via fan-out, sen bygg-loop från #1.

---

# (HISTORIK) Bygg-framsteg — första 25 nya spel

Mål: 25 nya spel byggda, förenklade, testade och buggfixade. En fas per spel.
Status-symboler: ⬜ Väntar · 🔨 Bygger · ✅ Klar.

**Klara: 25 / 25**

| # | id | Titel | Status | Byggd | Simplify | Testad | Buggar fixade / noter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `poppa-ballonger` | Poppa Ballongerna | ✅ Klar | ✔ | ✔ | ✔ | Renderar fint; pop→firande→ny runda; 0 konsolfel |
| 2 | `tryck-och-forvandla` | Tryck och Förvandla | ✅ Klar | ✔ | ✔ | ✔ | Förvandlas vid tryck; framstegsring fylls; 0 konsolfel |
| 3 | `kittla-figuren` | Kittla Figuren | ✅ Klar | ✔ | ✔ | ✔ | Figur skrattar/sprattlar; 6 zoner; 0 konsolfel efter fixar |
| 4 | `fargregn` | Färgregn | ✅ Klar | ✔ | ✔ | ✔ | Droppar faller; tryck rätt färg; nivåer; 0 konsolfel |
| 5 | `mata-monstret` | Mata Monstret | ✅ Klar | ✔ | ✔ | ✔ | Dra/tap-tap mat till munnen; 3-4 rätter; 0 fel; runda sparas |
| 6 | `rakna-applen` | Räkna Äpplena | ✅ Klar | ✔ | ✔ | ✔ | Räkna 2-5 äpplen, röst räknar; 0 fel; UI-fix: flyttade trädet så progress-raden blev fri |
| 7 | `klappa-mullvaden` | Klappa Mullvaden | ✅ Klar | ✔ | ✔ | ✔ | Snäll whack-a-mole; mullvad kikar upp, klappa; ingen miss/timer; 0 fel |
| 8 | `peka-pa-kroppen` | Peka på Kroppen | ✅ Klar | ✔ | ✔ | ✔ | Rösten frågar kroppsdel, barnet pekar; 9 zoner; fel = mjuk omfrågning; 0 fel |
| 9 | `vilket-djur-later` | Vilket Djur Låter Så? | ✅ Klar | ✔ | ✔ | ✔ | Ljud-cue -> tryck rätt djur; 2-4 kort skalar med nivå; repetera-knapp; 0 fel |
| 10 | `stor-liten` | Stor och Liten | ✅ Klar | ✔ | ✔ | ✔ | Dra stora->Stor-lådan, små->Liten-lådan; överdriven storleksskillnad; 0 fel |
| 11 | `tarta-i-ansiktet` | Tårta i Ansiktet | ✅ Klar | ✔ | ✔ | ✔ | Kasta tårta på clownen; varje tryck = splatt+fniss; torka-knapp; firande+reset; 0 fel |
| 12 | `kla-pa-nallen` | Klä på Nallen | ✅ Klar | ✔ | ✔ | ✔ | Dra kläder till rätt kroppsdel på nallen; 2-3 plagg; snäpper på; 0 fel |
| 13 | `plantera-fron` | Plantera Frön | ✅ Klar | ✔ | ✔ | ✔ | Så frö (drag) -> vattna (tap) -> växer frö->grodd->knopp->blomma; fjärilar; 0 fel |
| 14 | `skuggmatchning` | Skuggmatchning | ✅ Klar | ✔ | ✔ | ✔ | Dra föremål till matchande svart skugga; skuggan blommar till färg; 2-4 par; 0 fel |
| 15 | `enkelt-pussel` | Enkelt Pussel | ✅ Klar | ✔ | ✔ | ✔ | Dra 2-4 pusselbitar i ramen; riktiga pusselformer (knopp/hål); 4 motiv; 0 fel |
| 16 | `plask-i-vattnet` | Plask i Vattnet | ✅ Klar | ✔ | ✔ | ✔ | Dra föremål i vattnet -> flyter/sjunker (fysik); plask+bubblor; tryck-vatten-plask; 0 fel |
| 17 | `kla-efter-vadret` | Klä efter Vädret | ✅ Klar | ✔ | ✔ | ✔ | Klä figuren efter vädret (sol/regn/snö); pooled regn/snö; 0 fel; fixade stray-streck i munnen |
| 18 | `vart-tog-det-vagen` | Vart Tog Det Vägen? | ✅ Klar | ✔ | ✔ | ✔ | Kopp-spel: visa leksak -> blanda koppar -> hitta rätt; fel = kika igen; 0 fel |
| 19 | `vad-forsvann` | Vad Försvann? | ✅ Klar | ✔ | ✔ | ✔ | Titta -> göm (filt) -> en försvinner -> tryck tomma platsen; 3-6 objekt; 0 fel |
| 20 | `bygg-tornet` | Bygg Tornet | ✅ Klar | ✔ | ✔ | ✔ | Dra klotsar -> snäpper på tornet (förlåtande), räknar högt; aldrig kollaps; 0 fel |
| 21 | `rulla-bollen-hem` | Rulla Bollen Hem | ✅ Klar | ✔ | ✔ | ✔ | Sikta-knuffa bollen till målet; studsar på väggar; no-fail auto-hjälp; 0 fel |
| 22 | `siffertaget` | Siffertåget | ✅ Klar | ✔ | ✔ | ✔ | Koppla vagnar 1->N i ordning; nästa-siffran glöder; räknar högt; tut tut; 0 fel |
| 23 | `spara-linjen` | Spåra Linjen | ✅ Klar | ✔ | ✔ | ✔ | Spåra linjen med fingret; prickar tänds + färgspår; förlåtande; 4 former; 0 fel |
| 24 | `harma-melodin` | Härma Melodin | ✅ Klar | ✔ | ✔ | ✔ | Simon: lyssna pa sekvens -> harma; 4 plattor m. egna ljud; fel=spela om; 0 fel |
| 25 | `folj-sparet` | Följ Spåret | ✅ Klar | ✔ | ✔ | ✔ | Demo lyser spåren -> härma genom att trycka i ordning; figur går hem; 0 fel |

---

## Logg
(Fylls på per fas: vad som byggdes, vad testet visade, vilka buggar/UI-fix som gjordes.)
- **poppa-ballonger**: Byggd + förenklad (tog bort död COLORS.sky, dedup spawn-X). Playwright: 5 ballonger poppas, runda klar→ny runda, inga fel.
- **tryck-och-forvandla**: Byggd + förenklad (svensk artikel per emoji, ring/nivå återställs från custom). Playwright: tryck förvandlar figuren, ring fylls, inga fel.
- **kittla-figuren**: Byggd. Hittade+fixade 3 plattformsbuggar: puff & bigCelebration tweenade förstörda objekt (proxy-mönster), splash entré-tweens dödades ej vid snabbtryck. Ny exit-säker floatText-hjälpare + CLAUDE.md-regel. Playwright: full runda + firande + mid-anim exit = 0 fel.
- **fargregn**: Byggd + testad i Playwright (0 fel, renderar mål-skylt + droppar). Städade poppa-ballonger dubbelkonfetti (complete() äger firandet).
- **mata-monstret**: Byggd + testad (tap-tap matning slutförde runda, stars+matningar sparades, 0 fel). Plattformsfix: DragController.clear() dödar pågående tweens (exit-säker för ALLA dragspel); sparkle() nu proxy-baserad/exit-säker.
- **rakna-applen**: Byggd + testad (runda slutförd, sparad, 0 fel). UI-fix: dekorträdet låg mitt i topp-progressraden -> flyttat till gräset nere t.v.
- **klappa-mullvaden**: Byggd + testad (slutförde runda, level upp, 0 fel). Mullvad maskad så den kommer upp ur hålet. Snäll: omklappad mullvad duckar bara, ingen bestraffning.
- **peka-pa-kroppen**: Byggd + testad (runda slutförd via zon-cykling, 0 fel). Programmatisk figur med 9 träffzoner; fel-tryck bestraffar ej (vinglar + frågar om).
- **vilket-djur-later**: Byggd + testad (rundor 0->5, stjärna vid 5:e rätt = complete() firar, level 2->3 kort, 0 fel). Förtydligade CLAUDE.md om vilka feedback-hjälpare som är självstädande.
- **stor-liten**: Byggd + testad (3 rundor slutförda, stars 3, 0 fel). Drag via DragController (tap-tap funkar), tydlig stor/liten-kontrast, firande varje runda.
- **tarta-i-ansiktet**: Byggd + testad (8 tårtor, 2 rundor firade, gräddsplatt syns, 0 fel). Ren orsak-verkan-lek, allt tryck positivt, pooled cake (exit-säker).
- **kla-pa-nallen**: Byggd + testad (3 rundor, stars 3, 2- och 3-plaggslayouter funkar, 0 fel). DragController, plagg reparentas in i nallen, hint-ringar.
- **plantera-fron**: Byggd + testad (3 rundor, flowers 4, fjäril+firande, 0 fel). Drag-så + tap-vattna + staged växt-timeline per spec.
- **skuggmatchning**: Byggd + testad (3 rundor, stars 3, tydliga tint-svarta siluetter, 0 fel). DragController, skugga tonar svart->färg vid match.
- **enkelt-pussel**: Byggd (agent avbröts av sessionsgräns före registrering -> jag granskade modulen, registrerade, testade). 3 rundor (2/3/4 bitar), stars 3, 0 fel. Maskade scen-bitar, spök-förhandsvisning.
- **plask-i-vattnet**: Byggd + testad (6 föremål nedsläppta, runda klar, stars 1, 0 fel). Fysik flyter/sjunker per spec, plask-ringar (proxy), ambient bubblor via ticker, extra vatten-tryck-plask.
- **kla-efter-vadret**: Byggd + testad (3 rundor, stars 3, 1-2 zoner, 0 fel). UI-fix: munnens arc() saknade moveTo -> drog ett streck från origo; lagt till moveTo. Pooled regn/snö-partiklar, tint-bakgrund.
- **vart-tog-det-vagen**: Byggd + testad (3 rundor -> level+stjärna, gissning funkar, fel bestraffar ej, 0 fel). Persistenta koppar, gsap-blandning, leksak följer sin kopp.
- **vad-forsvann**: Byggd + testad (3 rundor, stars 3, 3/4/5-objektslayouter, 0 fel). Visa/täck/gissa-faser, filt-täckning, fel bestraffar ej.
- **bygg-tornet**: Byggd + testad (2 torn byggda, stars 2, 0 fel). Drag-stapling med magnetiskt snäpp (radie 1500 -> alltid lyckas), mjuk sway, räknar på svenska, mål-flagga + firande.
- **rulla-bollen-hem**: Byggd + testad (3 rundor, stars 3, 0 fel). Egen fysik (friktion/studs/hinder), drag=knuff + tap-tap, no-fail auto-hjälp vid stopp, nya banor per nivå.
- **siffertaget**: Byggd + testad (3 tåg, stars 3, N=3->4, 0 fel). Drag/tap-tap, bara förväntad vagn+slot accepteras, glödande nästa-vagn, dot-count för icke-läsare, tåget rullar iväg vid klart.
- **spara-linjen**: Byggd + testad (rak linje spårad, runda klar, stars 1, 0 fel). Finger-följ-prick-logik (auto-fyll skippade), färgspår, pencil-följare, former: rak/vågig/triangel/sicksack.
- **harma-melodin**: Byggd + testad (4 sekvenser klarade, vaxer 2->6, stars 4, 0 fel). Lyssna/harma-faser, distinkta pad-ljud, fel bestraffar ej (spelar om), Visa-igen-knapp, maskot.
- **folj-sparet**: Byggd + testad (3 spår klarade, stars 3, 0 fel). Simon-stil fotspårssekvens, figur hoppar längs spåret hem, fel bestraffar ej, Visa-igen-knapp. SISTA SPELET (25/25).

---

# v2 — 10 nya spel + naturlig röst + riktiga djurljud

Mål: 10 nya spel med mer animation, mer avancerad grafik och riktig fysik (matter.js).
Plus: naturlig svensk neural röst (förgenererade klipp) och riktiga CC0-djurljud.

**Grund klar:**
- ✅ **Röst**: pre-genererade neurala svenska klipp (lokal F5-TTS, EkhoCollective-modell) — 272 klipp, 4,5 MB. `VoiceService` hybrid: exakt klipp → mening-för-mening-kedja → Web Speech-fallback. Testad i appen (0 fel). Byggskript: `scripts/gen-voice.py` + `scripts/voice-phrases.json`. Referensröst bytbar med `--force --ref`.
- ✅ **Fysikmotor**: `matter-js` + delad brygga `src/lib/physics.js` (PhysicsWorld, exit-säker). Bevisad med studsbollar.
- ✅ **Djurljud**: riktiga läten genereras lokalt med MOSS-SoundEffect (se Fas 5) — 12 `djur_*`-klipp, inkopplade i `vilket-djur-later` + `djurorkester`.

**Spel: 10 / 10 klara**

| # | id | Titel | Type | Status | Testad | Noter |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `studsbollar` | Studsbollar | fysik/tap | ✅ Klar | ✔ | Bollgrop: tryck släpper glansiga bollar som studsar/krockar; 0 fel; exit-säker |
| 2 | `domino` | Domino | fysik/tap | ✅ Klar | ✔ | Tryck → garanterad kedja (kodstyrd spridning, riktig fysik-fall); 12/12 välter; 0 fel |
| 3 | `studsa-ner` | Studsa Ner | fysik/tap | ✅ Klar | ✔ | Plinko: boll pingar genom pinnar till 5 färgfack; 0 fel |
| 4 | `fanga-frukten` | Fånga Frukten | motorik/drag | ✅ Klar | ✔ | Dra korg (följer fingret), fånga fallande frukt; miss = mjuk puff; 0 fel |
| 5 | `vippbradan` | Vippbrädan | fysik/tap | ✅ Klar | ✔ | Gungbräda (revolute-constraint), släpp vikter, tippar; clampad vinkel; 0 fel |
| 6 | `studsmatta` | Studsmatta | fysik/tap | ✅ Klar | ✔ | Kanin studsar på elastisk matta, tryck = högre studs; 0 fel |
| 7 | `knuffa-tornet` | Knuffa Tornet | fysik/tap | ✅ Klar | ✔ | Rivningskula (pendel-constraint) välter 6-klosstorn → bygger om; 0 fel |
| 8 | `fyrverkeri` | Fyrverkeri | roligt/tap | ✅ Klar | ✔ | Nattlig himmel, raket→partikelskur (additiv glöd); ticker-partiklar; 0 fel |
| 9 | `sapbubblor` | Såpbubblor | roligt/tap | ✅ Klar | ✔ | Skimrande bubblor svävar upp, tryck=poppa; tydligt skild från klambubblor; 0 fel |
| 10 | `djurorkester` | Djurorkester | pedagogiskt/tap | ✅ Klar | ✔ | 2×3 djurkort, tryck → squash/stretch + djurljud (röst nu, riktigt ljud snart); 0 fel |

## v2-logg
- **Röst**: Hittade lokal F5-TTS svensk TTS i `storygen`-narratorn (EkhoCollective/f5-tts-swedish + röstkloning på RTX 4090, ~1s/klipp). Skrev `scripts/gen-voice.py`, extraherade alla repliker, genererade 272 klipp. Uppgraderade `VoiceService` till hybrid + mening-kedjning. Allt offline i runtime, precachat av SW.
- **studsbollar**: Byggd + testad. Tryck=släpp boll (fysik), studsar/krockar/staplas inom väggar, glansig look. Cyklade game→library→game→menu mitt i fysik = 0 fel.
- **Fysik-fix (plattform)**: `PhysicsWorld.update` använder nu FAST tidssteg (1/60 med ackumulator, max 5 substeg/ruta) i stället för variabelt dt. matter.js kräver fast steg — variabelt gjorde impulser/kollisioner opålitliga. Gynnar alla fysikspel. studsbollar regression-testad = ok.
- **domino**: Byggd + testad. Första försöket föll bara 1 bricka: (a) `setAngularVelocity` för stor → brickan snurrade som propeller runt sin mitt i st. f. att välta; (b) stel-kropps-kontakt mellan brickor nyckfull. Fix: liten knuff (0.12, gravitationen sköter vältningen) + KODSTYRD kedja (`_cascadeFrom` schemalägger nästa knuff ~100ms senare) → garanterad no-fail kedja där varje bricka ändå faller med riktig fysik. 12/12 välter, firande+reset, 0 fel.
- **studsa-ner (plinko)**: Byggd + testad. 7 rader statiska pinnar, tryck högst upp släpper boll → 5 färgfack; settle→sparkle; 0 fel.
- **fanga-frukten**: Byggd + testad. Korg följer fingret (full-screen drag), frukt faller (egen ticker-gravitation), närhetsfångst, miss=mjuk puff; 0 fel.
- **vippbradan**: Byggd + testad. Plank på revolute-constraint (pivot), tryck vänster/höger släpper vikt, plankan tippar (clampad ±0.55 så den ej slår runt); 0 fel.
- **studsmatta**: Byggd + testad. Kanin på elastisk matta, statisk hög-restitution-bädd + manuell rebound, tryck=högre studs + squash/stretch; 0 fel.
- **knuffa-tornet**: Byggd + testad. Rivningskula på pendel-constraint, tryck släpper/skjuter kulan mot 6-klosstorn → välter → firande → bygger om + återställer kulan; 0 fel.
- **fyrverkeri**: Byggd + testad. Nattlig gradient-himmel + tindrande stjärnor, tryck=raket→partikelskur med additiv glöd; egen ticker-partikelmotor (ej GSAP på Pixi-objekt → exit-säker); 0 fel.
- **sapbubblor**: Byggd + testad. Skimrande translucenta bubblor svävar upp (sinus-vobbel), tryck=poppa m. droppar; tydligt annorlunda än klambubblor; 0 fel.
- **djurorkester**: Byggd + testad. 2×3 djurkort (ko/hund/katt/groda/gris/anka), tryck → squash/stretch-studs + 🎵 + djurljud via röst (hook för riktigt djurljud finns); 0 fel.
- **Röst v2**: La till alla 10 nya spels repliker i `voice-phrases.json` och regenererade (skippar befintliga). Nya intron/ord får nu neural röst; allt annat täcks av kedjning/Web Speech-fallback.

---

# v3 — "Marknadskvalitet": polera ~15 äldre spel (fas-loop)

Mål: lyfta ~15 av de äldsta/enklaste spelen till marknadsnivå: polerad programmatisk
grafik + juice + variationer/nivåer (mot upprepning/för-lätt) + CC0-konst där det passar.
Riktiga SFX som egen fas. Varje fas: bygg grupp → simplify → testa → commit → nästa.

**Faser:**
- **Fas 0 — Grundverktyg**: ✅ `lib/scene.js` (gradient-himmel + sol/moln/kullar/bokeh/stjärnor, 7 teman, exit-säker drift) + `lib/feedback.js` utökad (`ripple`, `shake`, `burst`, `breathe`). Testad i appen (0 fel).
- **Fas 1** — klambubblor, poppa-ballonger, kittla-figuren, tryck-och-forvandla — ✅ (alla 0 fel, headless-testade)
- **Fas 2** — fargregn, rakna-applen, stor-liten, peka-pa-kroppen — ✅ (alla 0 fel, headless-testade; stor-liten även dragtestat)
- **Fas 3** — vandkort, skuggmatchning, vilket-djur-later, klappa-mullvaden — ✅ (alla 0 fel, headless-testade; skuggmatchning även dragtestat)
- **Fas 4** — sortera-skrap, mata-monstret, kla-pa-nallen — ✅ (alla 0 fel, dragtestade)
- **Fas 5 — Riktiga SFX**: ✅ KLAR (2026-06-29). MOSS-SoundEffect-tjänsten står uppe lokalt (återanvänder narrator-venv: torch 2.6+cu124 / transformers 5.1 / CUDA). Fixade en Windows-bugg i modellens fjärrkod (`Path()` manglade repo-id → backslash → HF-valideringsfel) genom att ladda den lokala snapshot-katalogen; skrev om `sfx_engine.py` till det riktiga v1-API:t (24 kHz). `scripts/gen-sfx.py` + `sfx-phrases.json` (`npm run sfx`) väljer best-of-N tagningar och bakar **16 riktiga klipp** till `public/audio/sfx/*.mp3` + manifest (pop/whoosh/reveal/celebrate + 12 djurläten). `AudioService` avkodar via Web Audio och spelar dem i `sfx()` (faller tillbaka på syntes); nytt `sample()`-API inkopplat i `vilket-djur-later` + `djurorkester` (faller tillbaka på röst). Små UI-blipp (tap/pling/flip/correct/match/soft) stannar medvetet som syntes. Alla berörda spel headless-testade 0 fel.

## v3-logg
- **Fas 0**: Byggde delat grundverktyg. `scene.js`: drop-in bakgrund (`createScene(theme)`), teman sky/meadow/sunset/candy/water/night/warm. `feedback.js`: ripple (tryck-ring), shake (mjuk skärmskakning), burst (saftig partikelexplosion), breathe (idle-puls) — alla exit-säkra. Verifierat: meadow-scen + juice renderar fint, 0 fel.
- **Testverktyg**: MCP-webbläsaren tappade anslutningen mitt i fas 1 -> byggde `scripts/test-game.mjs` (Playwright + systemets Chrome, `channel:'chrome'`, huvudlöst) så testning är självförsörjande: navigerar in, trycker brett, kör exit-cykel (spel->bibliotek->spel->meny), rapporterar konsolfel + skärmdump. `npm i -D playwright`.
- **Fas 1**: Uppgraderade 4 spel (bevarad mekanik, lade på scen-bakgrund + juice + djup/nivåer). Alla headless-testade = 0 fel; produktionsbygge ok.
  - **klambubblor**: vatten/varierande tema per nivå, glansiga bubblor m. iris-skimmer, överrasknings-emoji, regnbågsbubbla som kedje-poppar grannar, valfritt no-fail färgmål, växande antal/nivå.
  - **poppa-ballonger**: sky-scen, glansiga ballonger m. knut+snöre, gyllene bonusballong, röst-räkning, fler/snabbare per nivå, squash/stretch-pop.
  - **kittla-figuren**: candy-scen, 4 söta figurer (klump/björn/kanin/monster) som blinkar+andas, fler zoner, kittel-sekvens på högre nivåer.
  - **tryck-och-forvandla**: meadow-scen, 10 förvandlingskedjor som nivåer, fler objekt + flerstegs-förvandling på högre nivåer, magisk poff.
  - Röstrepliker för alla fyra tillagda i `voice-phrases.json` + regenererade.
- **Fas 2**: Uppgraderade 4 lär-spel (bevarad mekanik + scen + juice + djup/nivåer). Alla headless-testade = 0 fel; `test-game.mjs` fick `--drag` (riktiga musdrag) för dragspel.
  - **fargregn**: sky-scen m. sol/moln, glansiga droppar m. spår, pölar i marken, regnbågsdroppe; nivåer = fler färger/snabbare/tätare + talat färgmål m. målantal.
  - **rakna-applen**: meadow-scen, programmatiskt träd + glansig frukt (äpple/päron/apelsin/plommon/citron varierar per runda), stor studsande siffra, korg, talad räkning + "tryck på N"-mål, mål 3→10.
  - **stor-liten**: meadow-scen, korgar m. storleks-spöke som ikon, fler+varierade objekt, MELLAN-korg + mellanstorlek från nivå 5; DragController återanvänd, dragtestat ok.
  - **peka-pa-kroppen**: meadow-scen, gullig chibi-figur (blinkar/andas, byter skepnad/runda), fler kroppsdelar (huvud→knä), glödring-ledtråd, fler frågor + snabbare per nivå.
  - +167 röstrepliker (siffror×frukter, kroppsdels-mallar) tillagda + regenererade.
- **Fas 3**: Uppgraderade 4 minne/matchnings-spel (bevarad mekanik + scen + juice + djup/nivåer). Alla headless-testade = 0 fel; skuggmatchning dragtestat (runda löstes, ny variation).
  - **vandkort**: scen varierar per runda, premium-kort (mönstrad baksida, mjuk 3D-vändning, glansig framsida), match-glow; rutnät växer 2×2→4×4, symboluppsättning + tema roterar per runda (djur/frukt/fordon/figurer/havsdjur).
  - **skuggmatchning**: meadow-scen, glansiga objekt + läsbara siluett-slots som blommar i färg, 44-objekts-pool m. anti-upprepning, 2→6 per runda; DragController återanvänd, dragtestat.
  - **vilket-djur-later**: meadow-scen, gulliga djurkort m. egen accentfärg-spotlight, tydlig "spela ljud igen"-knapp, 2→6 val/nivå, 12-djurs-pool, distraktorer delar aldrig ljud.
  - **klappa-mullvaden**: meadow-gräsmatta, ritade jordhögar m. djup, 5 kritter-arter (mullvad/kanin/igelkott/mus/groda), tass-framsteg, fler hål + snabbare/nivå, strikt no-fail.
  - +64 röstrepliker (kort-teman, objektnamn, djurljud, klapp-beröm) tillagda + regenererade.
- **Fas 4**: Uppgraderade 3 dragspel (bevarad mekanik + scen + juice + djup/nivåer). Alla dragtestade = 0 fel.
  - **sortera-skrap**: meadow-scen, färgkodade tunnor m. ikon-disk (papper/mat/plast/glas-metall, ingen läsning), lyft-skugga, lock-studs; 2→4 tunnor/4→10 saker, jämn fördelning + variation/runda.
  - **mata-monstret**: meadow-scen, uttrycksfullt monster (pupiller följer maten, mun gapar/tuggar, mage-vobbel, blinkar), 4 monster cyklar, 3→6 mat/nivå, mild favorit-kategori (alltid no-fail).
  - **kla-pa-nallen**: scen roterar per outfit, gullig nalle (blinkar, slot-ringar), 5 outfits (vinter/sommar/regn/fin/mys) m. varianter, 2→5 plagg/nivå; DragController återanvänd, dragtestat (klar→firande→ny outfit).
  - +73 röstrepliker (tunnor, monster-repliker/namn, nalle-plagg/outfits) tillagda + regenererade.

**15-spels-uppgraderingen (fas 1–4) KLAR.** Fas 5 (riktiga SFX) KLAR 2026-06-29 (se nedan).

## Avslut (2026-06-29)
- **Status**: Fas 0–4 klara & commitade (5 commits: foundation + fas 1–4). 38 spel totalt; 15 lyfta till marknadskvalitet. Alla headless-testade 0 fel; produktionsbygge rent.
- **Röst**: 650 neural-klipp (sv) i `public/audio/voice` (precachas offline).
- **PWA-tvångsuppdatering**: SW är `prompt`-läge + `skipWaiting:false` -> uppdatering läggs på vänt och appliceras vid MENYN (aldrig mitt i spel, by design). Ett nytt bygge ändrar precache-hashen (682 poster, 10,6 MiB) -> installerade klienter hämtar nya SW:n och appliceras nästa gång de når menyn / startar om appen. Ingen versionsbump behövs (innehålls-hash).
- **Tjänster**: dev (5173) + preview (4173, serverar `dist/`) körs; `tailscale serve --bg --https=8445 http://127.0.0.1:4173` återställd.
- **Telefontest-URL**: https://andreas-psai1.tail4e6703.ts.net:8445/ (HTTPS = PWA-install/offline). Verifierad: index/sw.js/manifest/ljud = 200; prod-bygget bootar 0 fel ("Klar att spela offline").
- **Testverktyg**: `node scripts/test-game.mjs <id> [--drag "fx,fy>tx,ty;..."] [--shot out.png]` (Playwright + systemets Chrome, oberoende av MCP). Dev-only `window.__barnspel` krävs (funkar ej mot prod-bygget).

---

# Uppdatering (2026-06-29) — Björkvallens Värld + Fas 5 + namngivna barn

- **Namnbyte**: appen heter nu **BJÖRKVALLENS VÄRLD**. In-app-ordmärke i versaler (splash + meny, med auto-krymp så det aldrig spiller över — verifierat med skärmdump); OS/manifest i versalgemener ("Björkvallens Värld", `short_name` "Björkvallen"), HTML-titel, apple-titel, beskrivning, `package.json`, README/CLAUDE/ARCHITECTURE-rubriker, kommentarer. Ny välkomstreplik ("Välkommen till Björkvallens värld!"). Interna id:n orörda (`localStorage`-nyckel `pwagames.save.v1`, dev-globalen `__barnspel`).
- **Fas 5 — riktiga SFX**: KLAR (se v3-faslistan ovan). MOSS-SoundEffect lokalt + `npm run sfx` → 16 klipp i `public/audio/sfx`; `AudioService` sampel + syntes-fallback; `vilket-djur-later` + `djurorkester` spelar riktiga djurläten. **Tjänsten kräver PowerShell** för `npm run sfx`/`voice` (forward-slash-venv-sökväg knäcks under git-bash→cmd).
- **Namngivna människor**: alla avbildade personer i spelen heter nu något av **Zacke/Alissa/Elvira/Lova** (ägarens barn). En workflow skannade alla 38 spel → exakt 3 personer: `peka-pa-kroppen`→**Zacke**, `tarta-i-ansiktet` (clown)→**Alissa**, `kla-efter-vadret`→**Elvira** (figuren hette felaktigt "Bobo" = krock med maskoten; omdöpt + "hen"→"hon"). **Lova** reserverad för nästa flickfigur. Regel + `CHARACTERS`-lista i `CLAUDE.md`/`lib/theme.js` för framtida spel. Djur/monster/nallen/Bobo undantagna.
- **Röst**: 658 neural-klipp (8 nya: välkomst + Zacke/Alissa/Elvira-repliker).
- **Bygge**: produktionsbygge rent (707 precache-poster, ~11 MiB, inkl. alla nya SFX/röst-klipp).
- **Telefontest**: `npm run build` → `npm run preview` (4173) → `tailscale serve --bg --https=8445 http://127.0.0.1:4173`. URL: https://andreas-psai1.tail4e6703.ts.net:8445/ — verifierad: index/sw.js/manifest/sfx+röst-ljud = 200, manifest-namn "Björkvallens Värld".

---

# v4 — Avancerade fysikspel med mål + mer kontroll (2026-06-29)

Mål: de nyaste spelen var mest fysik-demos (spawna/starta). Nu: riktiga SPEL med MÅL och
mer styrning — placering, riktning + KRAFT (acceleration), och egenskaper som påverkar
utfallet (massa/täthet, studs/restitution, gravitation, vind, krafter, kollisioner).
Bibliotek: **matter-js** (fanns redan) — ingen ny dependency.

**Delat fysik-verktyg (återanvänd för alla fysikspel):**
- `src/lib/physics.js` utökat: `MATERIALS`-förval (bouncy/normal/heavy/light/sticky → restitution/täthet/massa/friktion), `setWind(ax,ay)` (kraftfält på alla dynamiska kroppar ∝ massa), `setGravity(y,x?)`, `predictTrajectory(...)`, re-export `Body`/`Composite`/`Vector`. (Befintliga fysikspel orörda; bygget grönt.)
- `src/lib/launcher.js` — **`AimLauncher`**: återanvändbar "sikta + kraft"-kontroll (dra för riktning+styrka med PRICKAD banförhandsvisning; slangbella eller kast; tap-fallback mot `defaultAim`; `setWind`/`setPreview` håller pricklinjen ärlig). Exit-säker.
- Designregel tillagd i `CLAUDE.md` ("Advanced physics"): mål-baserat (nå/samla/fyll) + minst en extra kontroll som ändrar utfallet; ALDRIG fail-state — missar är roliga + mjuk auto-hjälp garanterar framgång.

**3 nya spel (byggda av parallella agenter mot verktyget, headless-testade 0 fel):**
| id | Titel | Mål + styrning | Fysik |
| --- | --- | --- | --- |
| `spindelhjalten` | Spindelhjälten 🕷️ | Slangbella en gullig (egen, ej Marvel) spindelhjälte till alla stjärnor/katten; **vind-knapp** kröker banan | gravitation, studs/momentum, väggar + studs-bumper (kollisioner via label), vind |
| `enhorningen-elvira` | Enhörningen Elvira 🦄 | **Placera** studsmoln (drag), släpp Elvira → studsar till regnbågen + plockar ädelstenar; **lätt/tung**-knapp ändrar utfallet | gravitation/massa per vikt, studs mot statiska moln, friktion, vind på högre nivå |
| `bajs-och-kiss` | Bajs och Kiss 💩 | Elvira & Zacke kastar bajs i pottan (sikta+kraft); fyll pott-mätaren; **storlek/massa**- + **pruttvind**-knappar; **prutt-ljud** | kastbåge, massa per storlek, studs mot pottkant/golv, vind, sensor-kollision i pottan |

Alla tre: no-fail (auto-hjälp garanterar framgång), nivåskalning (highestLevel), 96px-träffytor, tap + ett förlåtande drag, exit-säkra. Registrerade i `registry.js` (nu **41 spel**).

**Ljud (riktiga, offline):** 5 nya MOSS-SFX-klipp via `npm run sfx` — `fart`/`plopp`/`boing`/`thwip`/`magi` (21 klipp totalt i `public/audio/sfx`). 35 nya neurala röstrepliker (Spindelhjälten/Elvira/Zacke-rader) → 693 röstklipp totalt. Bygge grönt.

## v4.1 — Retrofit: 8 fysik-demon → riktiga mål-spel (2026-06-29)

De 8 äldre fysik-demona uppgraderade (bevarad mekanik + exit-säkerhet, pålagt MÅL + utfalls-styrande kontroll + no-fail) via samma verktyg. Byggda av parallella agenter (mekaniken bevarad, headless-testade 0 fel — jag verifierade alla 8 själv med skärmdump + exit-cykel; agenternas slutrapport kapades av en sessionsgräns men filerna var färdigskrivna och rena).

| id | Nytt mål | Ny kontroll | Fysik |
| --- | --- | --- | --- |
| `studsbollar` | Få N bollar i korgen (mätare) | sikta+kraft-skott + studsig/tung-knapp | massa/studs/momentum, kollisioner |
| `domino` | Kedjan ska nå & ringa klockan 🔔 | DRA brickor och brygga luckorna | fall-kedja, kollisioner |
| `studsa-ner` | Landa myntet i fickan som lyser | DRA släpp-position längs toppen | plinko-studs mot pinnar |
| `vippbradan` | Katapult: fånga grodan 🐸 i korgen | välj vikt-storlek/massa (liten/mellan/stor) | hävstång (revolute), momentum-överföring |
| `studsmatta` | Fånga alla morötter/stjärnor på höjd | DRA mattan i sidled + ladda studs | studs/restitution, höjd |
| `knuffa-tornet` | Knuffa ner alla klossar / kronan 👑 | dra kulan bakåt → sving-kraft+vinkel | pendel, kollisioner, momentum |
| `fyrverkeri` | Tänd alla mål-stjärnor på himlen | sikta+kraft på raketen (prickbana) | gravitation på raketen |
| `sapbubblor` | Blås bubblorna in i ringen 🛟 | WIND-fläktar (kraft ∝ massa) | massa/luftmotstånd/momentum, vind |

Alla: no-fail (auto-hjälp), nivåskalning, 96px-träffytor, exit-säkra. **41 spel totalt** (15 äldsta + 3 nya + nu de 8 demona = mål-baserade fysikspel). +68 nya röstrepliker (mål-intron/beröm). Det delade fysik-verktyget (`physics.js` + `launcher.js`) bevisat över 11 spel.

---

# Session-avslut (2026-06-29)

Tre spår klara & commitade denna session:
1. **Namnbyte → BJÖRKVALLENS VÄRLD** + **Fas 5 riktiga SFX** (lokal MOSS-SoundEffect) + **namngivna människor** (Zacke/Alissa/Elvira/Lova). Commit `f596a2f` (+ MOSS-tjänstfix `storygen@3b092b8`).
2. **Avancerat fysik-verktyg** (`physics.js` MATERIALS/wind/predict + `launcher.js` AimLauncher) + **3 nya spel** (spindelhjalten, enhorningen-elvira, bajs-och-kiss). Commit `44ee741`.
3. **Retrofit av 8 fysik-demon → mål-spel** (studsbollar/domino/studsa-ner/vippbradan/studsmatta/knuffa-tornet/fyrverkeri/sapbubblor). Commit `749ecd0`.

**Nuläge:** 41 spel (11 mål-baserade fysikspel på det delade verktyget). Ljud helt offline & egengenererat: **21 riktiga SFX-klipp** (`public/audio/sfx`, inkl. djurläten + fart/plopp/boing/thwip/magi) via `npm run sfx` → lokal MOSS-tjänst; **761 neurala röstklipp** (`public/audio/voice`) via `npm run voice` → F5-TTS. **OBS:** kör `npm run sfx`/`voice` från **PowerShell** (forward-slash-venv-sökväg knäcks under git-bash→cmd). Produktionsbygge rent (815 precache-poster). Båda repona (pwagames + storygen) har rent arbetsträd.

**Telefontest (igång):** `npm run preview` (4173) + `tailscale serve --bg --https=8445` → https://andreas-psai1.tail4e6703.ts.net:8445/ (verifierad 200 + nya spel i bygget). Dev-servern (5173) och MOSS-tjänsten (8003) är stoppade. Installerad PWA hämtar nya SW:n vid menyn/omstart (innehålls-hash, ingen versionsbump).

**Förslag nästa gång:** spela de 11 fysikspelen på telefon och finjustera känsla (siktkänslighet/svårighet/ljud); ev. fler nya spel efter agent-gränsens återställning. Toolkit + mönster: se memory [[advanced-physics-toolkit]], [[real-audio-sfx]], [[character-names]], [[phone-testing-tailscale]].
