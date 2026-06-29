# Bygg-framsteg — 25 nya spel

Mål: 25 nya spel byggda, förenklade, testade och buggfixade. En fas per spel.
Status-symboler: ⬜ Väntar · 🔨 Bygger · ✅ Klar.

**Klara: 18 / 25**

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
| 19 | `vad-forsvann` | Vad Försvann? | ⬜ Väntar | | | | |
| 20 | `bygg-tornet` | Bygg Tornet | ⬜ Väntar | | | | |
| 21 | `rulla-bollen-hem` | Rulla Bollen Hem | ⬜ Väntar | | | | |
| 22 | `siffertaget` | Siffertåget | ⬜ Väntar | | | | |
| 23 | `spara-linjen` | Spåra Linjen | ⬜ Väntar | | | | |
| 24 | `harma-melodin` | Härma Melodin | ⬜ Väntar | | | | |
| 25 | `folj-sparet` | Följ Spåret | ⬜ Väntar | | | | |

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
