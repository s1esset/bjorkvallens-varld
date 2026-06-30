# 🐛 AKTIV: Byggplan 3 — Buggfixar & polish (från docs/bugfixes1.md)

Källa: `docs/bugfixes1.md` (användarens feedback). Autonom loop, prioriterad ordning, commit per fix.
Process: agent (fix, given item + spelfil + CLAUDE.md) → headless-test + screenshot → ev. simplify → commit.
Status: ⬜ ej påbörjad · 🟨 pågår · ✅ klar · ⏭️ delvis (resterande nedan).

Beslut (användaren): autonomt hela listan i prioordning; subjektiva val (utseende/redesign) bestämmer jag själv inom befintlig konst + P0-regler.

## Prio 1 — Kritiska spel-brytande buggar
| # | Spel | Problem | Status |
|---|------|---------|:--:|
| 1 | `mata-monstret` | Plinko-mat fastnar → oändlig ljudloop, spelet tar aldrig slut; monster synkar med plattform (kräver timing) | ✅ |
| 2 | `plask-i-vattnet` | Föremål fastnar, går ej att flytta; (+no-icons, bättre vattenfysik) | ✅ |
| 3 | `domino` | Klick var som helst→allt faller+vinst varje gång; går ej placera/flytta brickor | ✅ |
| 4 | `bygg-tornet` | Omöjligt placera block (startar om vid varje klick); block ska falla där man klickar, fysik avgör vinst | ✅ |
| 5 | `vad-forsvann` | Inget val av föremål, rätt varje gång; ska välja rätt saknat föremål bland alternativ | ✅ |
| 6 | `enhorningen-elvira` | Oändliga studs-loopar, fast enhörning, hemska studs-sfx; användaren ska styra hastighet; begränsa studsar | ✅ |
| 7 | `pruttbad` | Fastnar, ljud distar i loop; oklart syfte → omtänk spelläge | ✅ |
| 8 | `valpens-bajs` | Svävande träd; hunden går i himlen och bajsar (positionering mot marken) | ✅ |

## Prio 2 — Globalt/systemiskt (påverkar alla spel)
| # | Område | Problem | Status |
|---|------|---------|:--:|
| 9 | Röst | Repetitiv/loopad, för tät re-cue-intervall, samma fras för ofta | ✅ |
| 10 | Vinstljud | Blir snabbt irriterande → varierat/alternerande | ✅ |
| 11 | Anti-stuck / anti-ljudloop | Skydd globalt | ✅ |
| 12 | Nivåvariation | Svårare per runda, randomiserade element/positioner/krafter där det passar | ⬜ |
| 13 | Djurläten | Fel/dåliga → regenerera `djur_*` SFX | ⬜ |

## Prio 3 — UI "inga ikoner / ta bort behållare" + karaktär (blond)
| # | Spel | Ändring | Status |
|---|------|---------|:--:|
| 14 | `stor-liten` | Ta bort behållare runt föremål (no icons); röst upprepas vid inaktiv | ✅ |
| 15 | `skuggmatchning` | Inga ikon-behållare, separerade föremål | ✅ |
| 16 | `kla-efter-vadret` | Inga ikon-behållare; ta bort garnnystan; gör karaktären blond flicka | ⬜ |
| 17 | `kla-pa-nallen` | Inga ikoner — visa riktiga kläder i fullstorlek, dra→klär på/passar | ⬜ |
| 18 | `siffertaget` | Gör tåget mer tåg-likt, ta bort ikon inuti | ⬜ |
| 19 | `bajs-och-kiss` | Gör Elvira blond; hjälp ej för snabbt; spola-ned-"pappa" easter egg + barnskratt | ⬜ |
| 20 | `enhorning-glitterbajs` | Gör flickan blond; enhörning ser konstig ut; platform fel position; random nivåer | ⬜ |

## Prio 4 — Mekanik-omdesign
| # | Spel | Ändring | Status |
|---|------|---------|:--:|
| 21 | `tarta-i-ansiktet` | Svamp att dra över ansiktet (ersätt torka-knapp); tårtkast = fysik-flick | ⬜ |
| 22 | `plantera-fron` | Vattenslang/kanna, häll vatten→plantor växer över tid | ⬜ |
| 23 | `vart-tog-det-vagen` | Fler koppar var 3:e nivå; kopparna samma röda färg efter 3 rundor | ⬜ |
| 24 | `rulla-bollen-hem` | Hinder, svårare per stage (annan boll, ytor, vind, hinder) | ⬜ |
| 25 | `spara-linjen` | Anti-fusk (ej klicka annan prick), fler nivåer, svårare | ⬜ |
| 26 | `enkelt-pussel` | Fler pussel, +1 bit per nivå | ⬜ |
| 27 | `studsbollar` | Flytta boll-typ-knapp ned-höger; bollar krockar med skott-bollen; fixa irriterande studs-sfx + för många bollar | ⬜ |
| 28 | `studsa-ner` | Naturligare fall (ej magnetisk/konstig gravitation), studsigare | ⬜ |
| 29 | `fyrverkeri` | Inversera sikte (sikta dit du vill, bana följer fingret samma riktning) | ⬜ |
| 30 | `vippbradan` | Fixa gravitation; användaren väljer var vikten släpps; korgen längre ut | ⬜ |
| 31 | `studsmatta` | Användaren flyttar studsmattan upp/ner för höjd/hastighet | ⬜ |
| 32 | `knuffa-tornet` | Styr boll-fall mer; rep-fysik; ta bort kollisions-sfx; elastiska rep-val; bättre positioner | ⬜ |
| 33 | `gungan` | Fler nivåer, svårare per nivå | ⬜ |
| 34 | `spindelnatet` | Spindel→liten Spider-karaktär (röd dräkt, svarta linjer, vita ögon) som skjuter nät | ⬜ |
| 35 | `regnbagsmalaren` | Inre 2–3 bågar kan ej målas helt | ⬜ |

## Prio 5 — Omtänk helt
| # | Spel | Ändring | Status |
|---|------|---------|:--:|
| 36 | `lagerelden` | Omtänk hela spelet, bättre mål, slumpad svårighet | ⬜ |
| 37 | `ballonglyft` | Omdesigna, oklart vad man gör | ⬜ |
| 38 | `magnet-fiske` | Omtänk spelläge, mer intressanta/svårare nivåer | ⬜ |

## Logg
- 2026-06-30: Skapade tracker från `docs/bugfixes1.md`. Byggplan 2 (25 spel) klar innan detta. Startar Prio 1.
- **#9 Röst anti-upprepning** ✅: `VoiceService.say(text, force)` tystar EXAKT samma fras inom 8s (REPEAT_COOLDOWN_MS) — stoppar idle-recue-loopar/tät upprepning; andra repliker spelas direkt. Uttryckliga repetera-knappar (GameHost 🔊 + LibraryScreen) skickar `force=true` så de alltid spelar (ingen död tryckning). Committad.
- **#8 valpens-bajs** ✅: Rotorsak — `createScene('meadow')` utan groundH→default 96→grästopp 624 medan spelplanen ligger y300–700 (hund/träd "svävade"). Fix: `groundH:420` (grästopp=300=WALK.y0) + träd-bas till gräskanten. Test+screenshot: hund/träd står på gräset, 0 fel. Committad.
- **#10 Vinstljud-variation** ✅: `AudioService._celebrate()` — riktigt 'celebrate'-klipp får slumpad playbackRate 0.92–1.12 + ibland glittertopp; syntes-fallback slumpar tonart (C/D/E/F) + arpeggio-mönster. Varje vinst låter ny. Committad.
- **#1 mata-monstret** ✅: Plinko-pinnar 110→140 (offset 70), mat-radie 40→28 → diagonal-gap 91px>80px krav (fastnar ej); boing endast vid speed>1.4 + 120ms throttle (ingen ljudloop); stuck-detektor teleporterar fast mat till munnen efter 2s. Monster frikopplat från glid-plattform (ingen frame-perfekt timing). Test+screenshot in-game, 0 fel. Committad.
- **#2 plask-i-vattnet** ✅: Rotorsak — drag-container saknade `hitArea` (alla barn eventMode='none') → o-träffbar i Pixi v8. Fix: bar emoji + osynlig `Circle(0,0,56)` hitArea (=no-icons-kravet samtidigt). Bättre vattenfysik (bob bara för flytare, sjunkare-settle, yt-våg vid plask, dubbel-rings-ripple). Screenshot: bara föremål utan behållare, 0 fel. Committad.
- **#3 domino** ✅: Rotorsak — helskärms-tap-catcher startade vält + cascade auto-bryggade alla gap (vinst varje gång). Fix: vält startar ENDAST från start-brickan (`_startHit`); cascade stannar vid tomt gap; placering av saknad bricka återupptar välten; auto-fyll-gap efter idle = no-fail. complete() en gång (`_resolving`). Screenshot: kedja+gap+placering, 0 fel. Committad.
- **#4 bygg-tornet** ✅: Rotorsak — auto-svepande kran ignorerade tap-x (`_onTap` släppte bara från svept läge→ny kloss top→"startar om"). Fix: tap sätter `_dropX`, klossen faller där man trycker; vilande klossar→fysik avgör vinst (på tornet vs ramlade av); centrerings-magnet skalar med missar + auto-place efter 2 = no-fail. Screenshot: kloss på krok+ghost-mål+flagga, 0 fel. Committad.
- **#5 vad-forsvann** ✅: Rotorsak — "rätt" var bara den tomma cellen (`slot._isGap`), inget svarsval. Fix: `_showChoices` — svarsrad = saknat föremål + 2–3 distraktorer (synliga på brädet), tap rätt=klart; fel=wiggle+positiv re-cue (ingen buzzer); auto-hjälp glöd+auto-välj efter 2 missar/idle. Bräd-taps är nu bara lekfulla. Screenshot in-game, 0 fel. Committad.
- **#6 enhorningen-elvira** ✅: Rotorsak — moln restitution 0.92 (nära-elastiskt) + garanterad upp-boost varje studs = perpetuum (settle aldrig). Fix: restitution 0.6, avtagande boost→0 vid 5 studsar, bounce-cap+hård damp, MAX_FLIGHT 7s safety. Velocity-kontroll via AimLauncher (sikte+kraft+kalibrerad bana). Bounce-sfx mjuk 'pop' endast vid speed≥5 + 140ms throttle. Fixade vind-kalibrering (0.16→0.0005). Screenshot: trajectory-preview+regnbåge, 0 fel. Committad.
- **#7 pruttbad** ✅: Rotorsak — `_playSample` utan throttle (boing/plopp varje frame) + `_newRound` nollställde `_resolving` för tidigt→re-complete-loop=distorsion. Fix: `_sound()`-helper rate-limitar varje ljud per nyckel; collision endast vid äkta islag; `_resolving` nollas först i drain-onComplete; watchdog (foam ej växt 4s→poppa bubbla). Tydligare syfte: fetare mållinje+🏁-flagga + sido-foam-mätare m. ⭐. voiceIntro: "Tryck på Zackes mage så bubblar det! Fyll badet med skum ända upp till linjen." Screenshot: tydligt mål+mätare, 0 fel. Committad.
