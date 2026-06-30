# 🐛 AKTIV: Byggplan 3 — Buggfixar & polish (från docs/bugfixes1.md)

Källa: `docs/bugfixes1.md` (användarens feedback). Autonom loop, prioriterad ordning, commit per fix.
Process: agent (fix, given item + spelfil + CLAUDE.md) → headless-test + screenshot → ev. simplify → commit.
Status: ⬜ ej påbörjad · 🟨 pågår · ✅ klar · ⏭️ delvis (resterande nedan).

Beslut (användaren): autonomt hela listan i prioordning; subjektiva val (utseende/redesign) bestämmer jag själv inom befintlig konst + P0-regler.

## Prio 1 — Kritiska spel-brytande buggar
| # | Spel | Problem | Status |
|---|------|---------|:--:|
| 1 | `mata-monstret` | Plinko-mat fastnar → oändlig ljudloop, spelet tar aldrig slut; monster synkar med plattform (kräver timing) | ⬜ |
| 2 | `plask-i-vattnet` | Föremål fastnar, går ej att flytta; (+no-icons, bättre vattenfysik) | ⬜ |
| 3 | `domino` | Klick var som helst→allt faller+vinst varje gång; går ej placera/flytta brickor | ⬜ |
| 4 | `bygg-tornet` | Omöjligt placera block (startar om vid varje klick); block ska falla där man klickar, fysik avgör vinst | ⬜ |
| 5 | `vad-forsvann` | Inget val av föremål, rätt varje gång; ska välja rätt saknat föremål bland alternativ | ⬜ |
| 6 | `enhorningen-elvira` | Oändliga studs-loopar, fast enhörning, hemska studs-sfx; användaren ska styra hastighet; begränsa studsar | ⬜ |
| 7 | `pruttbad` | Fastnar, ljud distar i loop; oklart syfte → omtänk spelläge | ⬜ |
| 8 | `valpens-bajs` | Svävande träd; hunden går i himlen och bajsar (positionering mot marken) | ✅ |

## Prio 2 — Globalt/systemiskt (påverkar alla spel)
| # | Område | Problem | Status |
|---|------|---------|:--:|
| 9 | Röst | Repetitiv/loopad, för tät re-cue-intervall, samma fras för ofta | ✅ |
| 10 | Vinstljud | Blir snabbt irriterande → varierat/alternerande | ⬜ |
| 11 | Anti-stuck / anti-ljudloop | Skydd globalt | ⬜ |
| 12 | Nivåvariation | Svårare per runda, randomiserade element/positioner/krafter där det passar | ⬜ |
| 13 | Djurläten | Fel/dåliga → regenerera `djur_*` SFX | ⬜ |

## Prio 3 — UI "inga ikoner / ta bort behållare" + karaktär (blond)
| # | Spel | Ändring | Status |
|---|------|---------|:--:|
| 14 | `stor-liten` | Ta bort behållare runt föremål (no icons); röst upprepas vid inaktiv | ⬜ |
| 15 | `skuggmatchning` | Inga ikon-behållare, separerade föremål | ⬜ |
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
