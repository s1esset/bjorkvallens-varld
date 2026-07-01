# Spel-genomgång & förbättringsplan (Björkvallens Värld)

Per-spel designgenomgång **sett ur spelarens ögon** (barn 2–5 + förälder bredvid). Varje
`docs/games/<id>.md` fångar spelets **nuläge**, den **ursprungliga tanken**, **vad som gör
det lättjefullt/tunt**, och en konkret **förbättringsplan** för att lyfta spelet till en
riktig, marknadsfärdig kvalitet — utan att bryta P0-reglerna (no-fail, ingen poäng/timer,
≥96px träffytor, bara positiv feedback, exit-säkert).

## Vad "marknadsfärdig kvalitet" betyder här

Ett bra barnspel 2–5 är inte *svårare* — det är **rikare**. Mätstickan per spel:

1. **Kärnloop med agens** — varje pekning/drag ska kännas som ett *val* som påverkar utfallet,
   inte en knapp som gör samma sak varje gång. (Lättjefullt = "tryck → samma animation, alltid.")
2. **Variation & överraskning** — innehåll, positioner, färger, händelser varierar så att tur 2
   inte är identisk med tur 1. Sällsynta "wow"-ögonblick (regnbågsbubbla, gömd överraskning).
3. **Saftig feedback ("juice")** — ljud+bild <100ms, squash/stretch, partiklar, skärmskak,
   efterklang. Varje handling belönas multisensoriskt.
4. **Mjuk progression** — fältet/utmaningen växer lugnt med nivån; aldrig svårare på ett
   bestraffande sätt, men *nytt* att upptäcka.
5. **Karaktär & berättelse** — en maskot/figur som reagerar, en liten värld, en anledning
   att bry sig (Bobo/Zacke/Elvira). Tomma scener känns billiga.
6. **Ljud & röst** — varierat vinstljud, talad svensk instruktion + om-tilltal, riktiga
   djurläten/SFX där det finns.
7. **Tillgänglighet & lugn** — stora mål, förlåtande drag, inga blinkande/stressande element,
   tydligt "vad gör jag?" på <1s utan läsning.

Varje förbättringsförslag taggas: **[Quick]** (timmar), **[Medium]** (en pass), **[Deep]**
(omdesign/nya system). Vi jobbar i faser, ett spel i taget, och bockar av nedan.

## Doc-mall (varje spel följer denna)

```
# <Titel> (`<id>`)
> kategori · input · ålder · status-emoji

## 1. Nuläge (sett som spelare)
Vad möter spelaren? Kärnloop, kontroller, visuellt, ljud, progression. Vad funkar.
(+ skärmdump-referens)

## 2. Ursprunglig plan & tankeprocess
Designintention (ur kodkommentar + kontrakt): det pedagogiska/lek-målet, varför mekaniken.

## 3. Vad gör det lättjefullt / tunt
Ärlig spelar-kritik: var det är en minimal MVP, var loopen är grund, saknad juice/variation/
djup/karaktär, repetition, billiga lösningar.

## 4. Förbättringar & förhöjningar (plan)
Prioriterad, taggad ([Quick]/[Medium]/[Deep]) lista som tar spelet till marknadskvalitet.
Grupperad: Kärnloop · Variation · Juice · Progression · Karaktär · Ljud.

## 5. Status / loggar
Klart-bockar; commits när förbättringar genomförs.
```

## Index — 68 spel

Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar.
Grupperat efter biblioteksflik (se [[library-tabs-sort]]).

### 🎉 Roligt — ✅ HELA fliken byggd (första-omgång, 2026-07-01)
| # | Spel | id | input | status |
|---|------|----|-------|:--:|
| 1 | Klämbubblor | `klambubblor` | tap | 🔧 |
| 5 | Tryck och Förvandla | `tryck-och-forvandla` | tap | 🔧 |
| 6 | Kittla Figuren | `kittla-figuren` | tap | 🔧 |
| 14 | Tårta i Ansiktet | `tarta-i-ansiktet` | mixed | 🔧 |
| 32 | Fyrverkeri | `fyrverkeri` | drag | 🔧 |
| 37 | Såpbubblor | `sapbubblor` | tap | 🔧 |
| 41 | Bajs och Kiss | `bajs-och-kiss` | drag | 🔧 |
| 42 | Regnbågsmålaren Elvira | `regnbagsmalaren` | drag | 🔧 |
| 43 | Pruttbubbelbad | `pruttbad` | tap | 🔧 |
| 45 | Enhörningens Glitterbajs | `enhorning-glitterbajs` | drag | 🔧 |
| 49 | Lägerelden | `lagerelden` | mixed | 🔧 |
| 66 | Loopdjuren | `loopdjuren` | drag | 🔧 |
| 67 | Pizzabageriet | `pizzabageriet` | drag | 🔧 |
| 68 | Hamburgerbygget | `hamburgerbygget` | drag | 🔧 |

### ⚙️ Fysik & rörelse (fysik + motorik) — ✅ HELA fliken (första-omgång, 2026-07-01)
| # | Spel | id | input | status |
|---|------|----|-------|:--:|
| 4 | Poppa Ballongerna | `poppa-ballonger` | tap | 🔧 |
| 10 | Klappa Mullvaden | `klappa-mullvaden` | tap | 🔧 |
| 19 | Plask i Vattnet | `plask-i-vattnet` | drag | 🔧 |
| 23 | Bygg Tornet | `bygg-tornet` | tap | 🔧 |
| 24 | Rulla Bollen Hem | `rulla-bollen-hem` | drag | 🔧 |
| 26 | Spåra Linjen | `spara-linjen` | drag | 🔧 |
| 29 | Studsbollar | `studsbollar` | mixed | 🔧 |
| 31 | Studsa Ner | `studsa-ner` | mixed | 🔧 |
| 33 | Fånga Frukten | `fanga-frukten` | drag | 🔧 |
| 34 | Vippbrädan | `vippbradan` | tap | 🔧 |
| 35 | Domino | `domino` | mixed | 🔧 |
| 36 | Studsmatta | `studsmatta` | mixed | 🔧 |
| 38 | Knuffa Tornet | `knuffa-tornet` | drag | 🔧 |
| 39 | Spindelhjälten | `spindelhjalten` | drag | 🔧 |
| 40 | Enhörningen Elvira | `enhorningen-elvira` | mixed | 🔧 |
| 44 | Valpens Bajs | `valpens-bajs` | mixed | 🔧 |
| 46 | Tvätta Djuret | `tvatta-djuret` | drag | 🔧 |
| 48 | Gungan | `gungan` | tap | 🔧 |
| 50 | Spindelnätet | `spindelnatet` | tap | 🔧 |
| 52 | Fallskärmen | `fallskarmen` | drag | 🔧 |
| 53 | Enhörningen Flyger | `enhorningen-flyger` | drag | 🔧 |
| 54 | Spindel-Zacke Svingar | `spindel-zacke-svingar` | tap | 🔧 |
| 55 | Bobos Bowling | `bowling` | drag | 🔧 |
| 56 | Flipperspel | `flipperspel` | tap | 🔧 |
| 58 | Snöbollen | `snobollen` | drag | 🔧 |
| 59 | Glasstornet | `glasstornet` | drag | 🔧 |
| 64 | Grävmaskinen | `gravmaskinen` | drag | 🔧 |

### 🧩 Pussel (pussel + minne + drag) — ✅ alla docs skrivna (Fas 3)
| # | Spel | id | input | status |
|---|------|----|-------|:--:|
| 2 | Sortera Skräp | `sortera-skrap` | drag | 📝 |
| 3 | Vändkort | `vandkort` | tap | 📝 |
| 8 | Mata Monstret | `mata-monstret` | mixed | 📝 |
| 13 | Stor och Liten | `stor-liten` | drag | 📝 |
| 15 | Klä på Nallen | `kla-pa-nallen` | drag | 📝 |
| 16 | Plantera Frön | `plantera-fron` | drag | 📝 |
| 17 | Skuggmatchning | `skuggmatchning` | drag | 📝 |
| 18 | Enkelt Pussel | `enkelt-pussel` | drag | 📝 |
| 21 | Vart Tog Det Vägen? | `vart-tog-det-vagen` | tap | 📝 |
| 22 | Vad Försvann? | `vad-forsvann` | tap | 📝 |
| 27 | Härma Melodin | `harma-melodin` | tap | 📝 |
| 28 | Följ Spåret | `folj-sparet` | tap | 📝 |
| 51 | Magnetfiske | `magnet-fiske` | drag | 📝 |
| 57 | Kulbanan | `kulbana` | drag | 📝 |
| 60 | Golvet är Lava | `golvet-ar-lava` | drag | 📝 |
| 61 | Vattenvägen | `vattenvagen` | drag | 📝 |
| 63 | Kugghjulen | `kugghjulen` | drag | 📝 |
| 65 | Trollkarlens Blandning | `trollblandning` | drag | 📝 |

### 🔤 Lära (larande + pedagogiskt) — ✅ alla docs skrivna (Fas 4)
| # | Spel | id | input | status |
|---|------|----|-------|:--:|
| 7 | Färgregn | `fargregn` | tap | 📝 |
| 9 | Räkna Äpplena | `rakna-applen` | tap | 📝 |
| 11 | Peka på Kroppen | `peka-pa-kroppen` | tap | 📝 |
| 12 | Vilket Djur Låter Så? | `vilket-djur-later` | tap | 📝 |
| 20 | Klä efter Vädret | `kla-efter-vadret` | mixed | 📝 |
| 25 | Siffertåget | `siffertaget` | mixed | 📝 |
| 30 | Djurorkester | `djurorkester` | tap | 📝 |
| 47 | Ballonglyft | `ballonglyft` | tap | 📝 |
| 62 | Blixt och Dunder | `blixt-och-dunder` | mixed | 📝 |

**✅ Alla 68 spel granskade (Fas 1–4 klara). Nästa steg: genomför förbättringarna spel för spel
(samma redigera→test→screenshot→commit-loop), prioriterat efter de app-breda mönstren nedan.**

## Återkommande mönster (app-breda lyft)

Tvärs över Roligt- och Fysik-flikarna återkom samma "lättjefulla" drag — att åtgärda dem en gång
ger lyft i *många* spel:

> **Framsteg 2026-07-01:** ny delad primitiv `AudioService.tone({freq,dur,type,vol,slideTo,delay})`
> (pitchad synt-blip) tillagd — grunden för mönster #7 (riktig ton) och alla stigande kombo-/
> förvandlings-/rostnings-ljud. Mönster **#2** (mottagare) påbörjat: `lagerelden`, `pizzabageriet`,
> `hamburgerbygget` har nu en hungrig Bobo som tar emot & mumsar. Mönster **#7** påbörjat:
> `loopdjuren` har stämda pentatoniska instrument per djur; `klambubblor`/`regnbagsmalaren` sjunger.
> `sample('…')`-hookar inlagda i flera spel så riktiga MOSS-klipp (#3) auto-uppgraderar när de finns.
>
> **Framsteg 2026-07-01 (⚙️ Fysik-fliken — HELA fliken första-omgång, 27 spel):** alla 18 tidigare
> `📝`-spel fick en genomförd första-omgång (de 9 auto-hjälp-spelen var redan `🔧` sen mönster #1).
> Mönster **#2** (mottagare) rejält utbyggt: Bobo/mottagare i `flipperspel` (bor i maskinen),
> `vippbradan` (fångar grodan), `glasstornet` (äter glassen), `spindelhjalten` (kattung-räddning);
> **#7** (riktig tonhöjd via `tone()`): stigande kombo/skala i `poppa-ballonger`, `studsbollar`,
> `studsa-ner`, `glasstornet`. **#1** (mjukare auto-hjälp) fördjupat i `flipperspel`/`studsa-ner`.
> Fler `sample('djur_…')`/`plopp`-hookar (`klappa-mullvaden`, `valpens-bajs`, `plask-i-vattnet`).
> Ärligare fysik + agens: `domino` (riktig kedjereaktion, gap stannar naturligt), `studsa-ner`
> (flyttbar tratt = riktigt sikte), `snobollen` (kontinuerlig rull-tillväxt). Varje spel = egen commit,
> errorCount 0 (inkl. exit-mitt-i-animation-cykel).

- **Auto-hjälp som spelar banan åt barnet (Fysik-fliken, genomgående).** No-fail är rätt, men
  hjälpen är ofta så aggressiv att agensen försvinner: auto-magnet (bygg-tornet, fanga-frukten),
  garanterad vindpust/strike (bowling, gungan, enhorningen-elvira), auto-glid/auto-rita
  (studsmatta, spara-linjen, rulla-bollen-hem, spindel-zacke-svingar). *Grepp:* mjuka upp/fördröj
  hjälpen och låt barnets val (sikte/kraft/placering) faktiskt avgöra — hjälpen kickar bara in
  *sent* och *synligt* ("Jag hjälper till!"). Skicklighet ska kännas, aldrig krävas.
  **✅ ÅTGÄRDAT (2026-07-01) i alla 9 spel** — hjälpen fördröjd/mjukad, egna träffar/släpp firas
  mer, bowling fick spare-andrakast, elvira ett inbjudande hjälp-moln. Se varje spels doc §5.
- **Ingen mottagare/publik.** Skapelser (pizza, burgare, marshmallow, fyrverkeri) görs och
  försvinner — ingen kund/figur som tar emot, äter eller jublar. *App-bret grepp:* en återanvändbar
  "mottagar-maskot" (Bobo/Elvira) som väntar, reagerar och firar.
- **TTS-uttalade ljudeffekter.** Skratt/"Hihi!", plask, "Blås!" sägs av rösten istället för riktiga
  klipp. *Grepp:* knyt an till den uppskjutna SFX-pipelinen ([[real-audio-sfx]], #13) — riktiga
  skratt/fräs/plopp är genomgående [Quick]-vinster när MOSS kör.
- **En-utfalls-interaktioner.** Tryck/drag gör samma sak varje gång (samma poff, samma tint på
  helheten). *Grepp:* per-objekt-reaktion (osten smälter, figuren grimaserar) + utfall som beror på
  *vad* man valde.
- **Tomma scener utan karaktär.** Bar tapet bakom mekaniken. *Grepp:* en liten levande värld +
  maskot per scen.
- **Generisk belöning.** Samma konfetti+stjärna överallt. *Grepp:* spel-specifik finish (skära &
  servera, samla i en bok, publik som reser sig).
- **"Musik"-spel utan riktig ton.** harma-melodin, folj-sparet, loopdjuren, djurorkester använder
  generiska UI-blipp (`pling/pop/flip`) utan tonhöjd → låter aldrig som musik. *Grepp:* ge
  plattor/klossar en stämd skala (pentatonisk/dur) så sekvens/staplar bildar verklig melodi.
- **Oanvända riktiga ljud-klipp.** `audio.sample('djur_…')` (12 djurläten) finns men anropas inte i
  flera spel (t.ex. skuggmatchning, vandkort) — `vilket-djur-later` bevisar att de funkar. *Grepp:*
  koppla på de riktiga klippen där djur/föremål förekommer (genomgående [Quick] när de finns).

## Faser

Granskning sker i faser, ett spel i taget, doc + plan per spel. Förslag på fas-ordning:
fliksvis (Roligt → Fysik → Pussel → Lära) eller registerordning. Efter att planerna är
skrivna kan en separat omgång *genomföra* förbättringarna (commit per spel, samma
test→screenshot→commit-loop som tidigare). **Fas 1 (pågår):** `klambubblor` (exempel-doc
som sätter kvalitetsribban).
