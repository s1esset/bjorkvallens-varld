# Bygg-framsteg — 25 nya spel

Mål: 25 nya spel byggda, förenklade, testade och buggfixade. En fas per spel.
Status-symboler: ⬜ Väntar · 🔨 Bygger · ✅ Klar.

**Klara: 8 / 25**

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
| 9 | `vilket-djur-later` | Vilket Djur Låter Så? | ⬜ Väntar | | | | |
| 10 | `stor-liten` | Stor och Liten | ⬜ Väntar | | | | |
| 11 | `tarta-i-ansiktet` | Tårta i Ansiktet | ⬜ Väntar | | | | |
| 12 | `kla-pa-nallen` | Klä på Nallen | ⬜ Väntar | | | | |
| 13 | `plantera-fron` | Plantera Frön | ⬜ Väntar | | | | |
| 14 | `skuggmatchning` | Skuggmatchning | ⬜ Väntar | | | | |
| 15 | `enkelt-pussel` | Enkelt Pussel | ⬜ Väntar | | | | |
| 16 | `plask-i-vattnet` | Plask i Vattnet | ⬜ Väntar | | | | |
| 17 | `kla-efter-vadret` | Klä efter Vädret | ⬜ Väntar | | | | |
| 18 | `vart-tog-det-vagen` | Vart Tog Det Vägen? | ⬜ Väntar | | | | |
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
