# Spel-genomgång & förbättringsplan (Björkvallens Värld)

Per-spel designgenomgång **sett ur spelarens ögon** (barn 2–5 + förälder bredvid). Varje
`docs/games/<id>.md` fångar spelets **nuläge**, den **ursprungliga tanken**, **vad som gör
det lättjefullt/tunt**, och en konkret **förbättringsplan** för att lyfta spelet till en
riktig, marknadsfärdig kvalitet — utan att bryta P0-reglerna (inget "game over", ingen poäng/timer,
≥96px träffytor, bara positiv feedback, exit-säkert).

## Vad "marknadsfärdig kvalitet" betyder här

Ett bra barnspel 2–5 är inte *svårare* — det är **rikare**. Mätstickan per spel:

1. **Kärnloop med agens** — varje pekning/drag ska kännas som ett *val* som påverkar utfallet,
   inte en knapp som gör samma sak varje gång. (Lättjefullt = "tryck → samma animation, alltid.")
2. **Variation & överraskning** — innehåll, positioner, färger, händelser varierar så att tur 2
   inte är identisk med tur 1. Sällsynta "wow"-ögonblick (regnbågsbubbla, gömd överraskning).
3. **Saftig feedback ("juice")** — ljud+bild <100ms, squash/stretch, partiklar, skärmskak,
   efterklang. Varje handling belönas multisensoriskt.
4. **Mjuk progression & motstånd** — fältet/utmaningen växer lugnt med nivån, alltid med *nytt*
   att upptäcka. Hinder som barnet kan anpassa sig runt hör hit och gör spelet bättre; de får
   sakta ner, aldrig stoppa, och ska ha ett tak (hur mycket kan gå fel samtidigt) + lagom takt.
5. **Karaktär & berättelse** — en maskot/figur som reagerar, en liten värld, en anledning
   att bry sig (Bobo/Zacke/Elvira). Tomma scener känns billiga.
6. **Ljud & röst** — varierat vinstljud, talad svensk instruktion + om-tilltal, riktiga
   djurläten/SFX där det finns.
7. **Tillgänglighet & lugn** — stora mål, förlåtande drag, inga blinkande/stressande element,
   tydligt "vad gör jag?" på <1s utan läsning.
8. **Fristående objekt** — spelobjekt är riktiga ritade föremål med egen silhuett och eget liv
   (guppar, reagerar), aldrig en emoji/ikon i en ruta eller bricka. Brickor och kort är till
   för text och UI. Se P0 `ASSETS` i `CLAUDE.md` + `docs/DESIGN.md §8.1`.

Varje förbättringsförslag taggas: **[Quick]** (timmar), **[Medium]** (en pass), **[Deep]**
(omdesign/nya system). Vi jobbar i faser, ett spel i taget, och bockar av nedan.

De sju punkterna ovan är **kvalitetsgrinden** i `docs/PIPELINE.md`. Ett spel som byggs eller
poleras idag får inte landa som 🔧 — det passerar grinden eller är inte klart.

## Doc-mall (varje spel följer denna)

Mallen ligger i **`docs/games/_MALL.md`** — kopiera den för nya spel (`/spel` gör det åt dig).
Struktur: **§0 Spec** (ifylld innan kod skrivs) · **§1 Nuläge** sett som spelare ·
**§2 Ursprunglig plan & tankeprocess** · **§3 Vad som är lättjefullt/tunt** (ärlig kritik) ·
**§4 Förbättringsplan** ([Quick]/[Medium]/[Deep], grupperad: Kärnloop · Variation · Juice ·
Progression · Karaktär · Ljud) · **§5 Status/loggar** (bockar + commits).

## Index — 73 spel

Två **olika** kolumner — de blandades ihop tidigare och gjorde indexet omöjligt att läsa:

- **kvalitet** = spelets eget omdöme mot de 8 grindpunkterna.
  ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar.
- **polerad** = har spelet gått igenom **poleringsrundan** (metoden i `docs/POLERINGSRUNDA.md`
  — de tolv läckorna, P0 `ASSETS`, skärmdumpsgranskning)? ✅ körd · ⬜ står i kö.

Ett ✅ i *polerad* och 🔧 i *kvalitet* betyder alltså: rundan är körd, men spelet har kvar
[Deep]-punkter i sin doc §4. Det är ett ärligt läge, inte en efterblivet uppdaterad rad.
Varje spels egen statusrad (`docs/games/<id>.md`, rad 2) speglar **kvalitet**-kolumnen.

Grupperat efter biblioteksflik (se [[library-tabs-sort]]).

### 🎉 Roligt — ✅ **poleringsrundan KLAR** (15/15, v1.8.0, 2026-08-05)
*14 spel i kön + `zackes-biltvatt` som redan var klart.*
| # | Spel | id | input | kvalitet | polerad |
|---|------|----|-------|:--:|:--:|
| 1 | Klämbubblor | `klambubblor` | tap | ✅ | ✅ |
| 5 | Tryck och Förvandla | `tryck-och-forvandla` | tap | ✅ | ✅ |
| 6 | Kittla Figuren | `kittla-figuren` | tap | ✅ | ✅ |
| 14 | Tårta i Ansiktet | `tarta-i-ansiktet` | mixed | ✅ | ✅ |
| 32 | Fyrverkeri | `fyrverkeri` | drag | ✅ | ✅ |
| 37 | Såpbubblor | `sapbubblor` | tap | ✅ | ✅ |
| 41 | Bajs och Kiss | `bajs-och-kiss` | drag | ✅ | ✅ |
| 42 | Regnbågsmålaren Elvira | `regnbagsmalaren` | drag | ✅ | ✅ |
| 43 | Pruttbubbelbad | `pruttbad` | tap | ✅ | ✅ |
| 45 | Enhörningens Glitterbajs | `enhorning-glitterbajs` | drag | ✅ | ✅ |
| 49 | Lägerelden | `lagerelden` | mixed | ✅ | ✅ |
| 66 | Loopdjuren | `loopdjuren` | drag | ✅ | ✅ |
| 67 | Pizzabageriet | `pizzabageriet` | drag | ✅ | ✅ |
| 68 | Hamburgerbygget | `hamburgerbygget` | drag | ✅ | ✅ |
| 70 | Zackes Biltvätt | `zackes-biltvatt` | mixed | ✅ | ✅ |
| 73 | Mata Pappa | `mata-munnen` | drag | ✅ | ✅ |

✅ **`mata-munnen`s ägaruppdrag KÖKET är byggt** (v1.187–1.189): köksmiljö där bänkskivan skär
fotots halslinje, 12 klickbara stationer, 54 mat- och busobjekt hämtade ur `pizzabageriet` +
`hamburgerbygget`, och tre motorer där de syns (matter-hög på bänken · SPH-pöl · mjuk gegga).
Sond: `scripts/_kokprobe.mjs`. Mätningarna och de fyra fynden står i `mata-munnen.md` §4/§5b.

### ⚙️ Fysik & rörelse (fysik + motorik) — ✅ **poleringsrundan KLAR** (27/27, v1.7.0, 2026-08-04; +`natskott-pa-stan` byggd ✅ 2026-08-08)
*Första-omgången 2026-07-01. Poleringsrundan lyfte 9 spel till ✅. Kvalitetsspåret 2026-08-06
(mottagar-högen) lyfte 7 till: `gungan` · `fallskarmen` · `valpens-bajs` · `studsmatta` ·
`spindelnatet` · `enhorningen-flyger` (+ `knuffa-tornet`/`spindelhjalten` fick sin mottagare
men har en [Deep]-punkt kvar var). Resterande 🔧 har kvarvarande [Deep]-punkter i sin doc §4.
**2026-08-07:** avstämning mot koden lyfte `vippbradan` + `domino` till ✅ — deras [Deep]-punkter
var byggda (2026-08-04 resp. 2026-07-01) men aldrig strukna i §4, så badgen var bokföringsskuld,
inte kvalitetsskuld. Samma dag polerades `spindelhjalten` till ✅ på riktigt: hjälpen **bjuder in**
i stället för att avfyra skottet åt barnet (`_offerAssist` + Skjut!-knapp, no-fail-golvet kvar).*
| # | Spel | id | input | kvalitet | polerad |
|---|------|----|-------|:--:|:--:|
| 4 | Poppa Ballongerna | `poppa-ballonger` | tap | ✅ | ✅ |
| 10 | Klappa Mullvaden | `klappa-mullvaden` | tap | ✅ | ✅ |
| 19 | Plask i Vattnet | `plask-i-vattnet` | drag | ✅ | ✅ |
| 23 | Bygg Tornet | `bygg-tornet` | tap | ✅ | ✅ |
| 24 | Rulla Bollen Hem | `rulla-bollen-hem` | drag | ✅ | ✅ |
| 26 | Spåra Linjen | `spara-linjen` | drag | ✅ | ✅ |
| 29 | Studsbollar | `studsbollar` | mixed | ✅ | ✅ |
| 31 | Studsa Ner | `studsa-ner` | mixed | ✅ | ✅ |
| 33 | Fånga Frukten | `fanga-frukten` | drag | ✅ | ✅ |
| 34 | Vippbrädan | `vippbradan` | tap | ✅ | ✅ |
| 35 | Domino | `domino` | mixed | ✅ | ✅ |
| 36 | Studsmatta | `studsmatta` | mixed | ✅ | ✅ |
| 38 | Knuffa Tornet | `knuffa-tornet` | drag | ✅ | ✅ |
| 39 | Spindelhjälten | `spindelhjalten` | drag | ✅ | ✅ |
| 40 | Enhörningen Elvira | `enhorningen-elvira` | mixed | ✅ | ✅ |
| 44 | Valpens Bajs | `valpens-bajs` | mixed | ✅ | ✅ |
| 46 | Tvätta Djuret | `tvatta-djuret` | drag | ✅ | ✅ |
| 48 | Gungan | `gungan` | tap | ✅ | ✅ |
| 50 | Spindelnätet | `spindelnatet` | tap | ✅ | ✅ |
| 52 | Fallskärmen | `fallskarmen` | drag | ✅ | ✅ |
| 53 | Enhörningen Flyger | `enhorningen-flyger` | drag | ✅ | ✅ |
| 54 | Spindel-Zacke Svingar | `spindel-zacke-svingar` | tap | ✅ | ✅ |
| 55 | Bobos Bowling | `bowling` | drag | ✅ | ✅ |
| 56 | Flipperspel | `flipperspel` | tap | ✅ | ✅ |
| 58 | Snöbollen | `snobollen` | drag | ✅ | ✅ |
| 59 | Glasstornet | `glasstornet` | drag | ✅ | ✅ |
| 64 | Grävmaskinen | `gravmaskinen` | drag | ✅ | ✅ |
| 72 | Nätskott på stan | `natskott-pa-stan` | tap | ✅ | ✅ |

### 🧩 Pussel (pussel + minne + drag) — ✅ **poleringsrundan KLAR** (20/20, v1.10.0, 2026-08-06)
*Första-omgången 2026-07-02 var **innan** P0-regeln `ASSETS` fanns (2026-07-25) — och skulden
var verklig: 18 av 19 spel hade emoji som spelobjekt, ofta i en bricka. Allt är nu ritat, till
stor del via det nya delade `src/lib/artikoner.js`.*
| # | Spel | id | input | kvalitet | polerad |
|---|------|----|-------|:--:|:--:|
| 2 | Sortera Skräp | `sortera-skrap` | drag | ✅ | ✅ |
| 3 | Vändkort | `vandkort` | tap | ✅ | ✅ |
| 8 | Mata Monstret | `mata-monstret` | mixed | ✅ | ✅ |
| 13 | Stor och Liten | `stor-liten` | drag | ✅ | ✅ |
| 15 | Klä på Nallen | `kla-pa-nallen` | drag | ✅ | ✅ |
| 16 | Plantera Frön | `plantera-fron` | drag | ✅ | ✅ |
| 17 | Skuggmatchning | `skuggmatchning` | drag | ✅ | ✅ |
| 18 | Enkelt Pussel | `enkelt-pussel` | drag | ✅ | ✅ |
| 21 | Vart Tog Det Vägen? | `vart-tog-det-vagen` | tap | ✅ | ✅ |
| 22 | Vad Försvann? | `vad-forsvann` | tap | ✅ | ✅ |
| 27 | Härma Melodin | `harma-melodin` | tap | ✅ | ✅ |
| 28 | Följ Spåret | `folj-sparet` | tap | ✅ | ✅ |
| 51 | Magnetfiske | `magnet-fiske` | drag | ✅ | ✅ |
| 57 | Kulbanan | `kulbana` | drag | ✅ | ✅ |
| 60 | Golvet är Lava | `golvet-ar-lava` | drag | ✅ | ✅ |
| 61 | Vattenvägen | `vattenvagen` | drag | ✅ | ✅ |
| 63 | Kugghjulen | `kugghjulen` | drag | ✅ | ✅ |
| 65 | Trollkarlens Blandning | `trollblandning` | drag | ✅ | ✅ |
| 69 | Glittergrottan (3D) | `glittergrottan` | tap | ✅ | ✅ |
| 71 | Saftbaren | `saftbaren` | mixed | ✅ | ✅ |

### 🔤 Lära (larande + pedagogiskt) — ✅ **polerad** (9/9)
*Första-omgången 2026-07-02, poleringsrundan 2026-08-06. Sista fliken — rundan är klar.*
| # | Spel | id | input | kvalitet | polerad |
|---|------|----|-------|:--:|:--:|
| 7 | Färgregn | `fargregn` | tap | ✅ | ✅ |
| 9 | Räkna Äpplena | `rakna-applen` | tap | ✅ | ✅ |
| 11 | Peka på Kroppen | `peka-pa-kroppen` | tap | ✅ | ✅ |
| 12 | Vilket Djur Låter Så? | `vilket-djur-later` | tap | ✅ | ✅ |
| 20 | Klä efter Vädret | `kla-efter-vadret` | mixed | ✅ | ✅ |
| 25 | Siffertåget | `siffertaget` | mixed | ✅ | ✅ |
| 30 | Djurorkester | `djurorkester` | tap | ✅ | ✅ |
| 47 | Ballonglyft | `ballonglyft` | tap | ✅ | ✅ |
| 62 | Blixt och Dunder | `blixt-och-dunder` | mixed | ✅ | ✅ |

**Läget just nu:** alla **70** spel är granskade och alla 4 flikar har fått en genomförd
första-omgång. **Poleringsrundan: 71/71 KLARA** (🎉 Roligt 15 · ⚙️ Fysik 27 · 🧩 Pussel 20 · 🔤 Lära 9) —
**inget kvar** — rundan är avslutad 2026-08-06. Metoden ligger i `docs/POLERINGSRUNDA.md`.

Utöver rundan: de 🔧-märkta spelen har kvarvarande [Deep]-förslag i sin egen doc §4 — prioritera
efter de app-breda mönstren nedan, de lyfter många spel åt gången.

> **Läs §4 mot koden innan du planerar.** Avstämningen 2026-08-07 gick igenom alla 8 kvarvarande
> 🔧-spel och hittade **5 [Deep]-punkter som redan var byggda** men aldrig strukna: `vippbradan`
> (mottagare), `domino` (kedjereaktion), `enhorningen-elvira` (hjälpen bjuder in),
> `spindelhjalten` (hjälten firar eget), `tvatta-djuret` (djur-specifik finish). Två spel bar
> 🔧 helt i onödan. Detta är samma fälla som CLAUDE.md varnar för — den har nu slagit till
> tre gånger. **Stryk punkten i §4 i samma commit som du bygger den.**

## Återkommande mönster (app-breda lyft)

> **2026-08-08 (v1.39.0):** de app-breda lyften har fått ett eget, **mätt** planeringsdokument:
> **`docs/LYFTPLAN.md`** (motor · assets · rendering, 12-radig arbetsordning). Första raden är
> byggd — `src/lib/partiklar.js` gav **alla 72 spel 3× partikeltäthet** via `feedback.js`, utan
> att ett enda spel ändrades. Mönstret "generisk belöning" nedan är alltså *tätare* nu, men inte
> mer spel-specifik: den delen står kvar. Dokumentet svarar också på var fysiken är
> underutnyttjad (SPH-vätskan används av 1 spel av 8 möjliga, mjuka kroppar av 0) och pekar ut
> nästa lyft som träffar många spel: gradienter, djupare `scene.js`, kamera, mottagar-rigg.

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
- **Stora ytor i EN platt ton (uppmätt 2026-08-09).** Marker, jordprofiler, klippor och egna
  bakgrunder ritas ofta som en enda fylld form: `plantera-fron`s jord låg på **301 300 px** i en
  brun ton, mullvadens gräsmatta på 215 742, lavaspelets klippor på 135 828, och fyrverkeriets
  natthimmel var **48 staplade rektanglar**. *Grepp:* `verticalFill`/`sphereFill`/`topLightFill`
  ur `lib/form.js` — en rad per yta. *Mät först:* `node scripts/_plattprobe.mjs` rankar alla 72
  skärmdumpar på största enfärgade fältet. Sonden är en ledtråd; bilden avgör.
  ✅ Åtgärdat i 5 spel (v1.48.0) + D1:s tre (v1.95–1.97), fler kvar.
  ⚠️ **Kör `--medbakgrund` när du jämför FÖRE/EFTER.** Sonden räknar bort exakt EN ton som
  bakgrund, och det ger två fel som båda slog till 2026-08-10: den **rankar fel** (i
  `folj-sparet` var den borträknade tonen ängen själv, så spelet såg ut att ligga på 24 % när
  det låg på 89 % av skärmen i två toner), och den **rapporterar en falsk regression** när du
  tonar just den borträknade ytan — talet stiger fast bilden blir bättre.
  ⚠️ **"Platt är ibland rätt" höll inte i praktiken.** Den här raden pekade tidigare ut vitt
  ritpapper (`spara-linjen`) och en fotbollsplan uppifrån (`rulla-bollen-hem`) som legitimt
  platta. Båda gick ändå att lösa utan att röra deras karaktär: **ett vitt papper ska se ut
  som PAPPER** (skugga + svag toning = ett ark på ett bord i stället för ett hål i skärmen),
  och en fotbollsplan har **klipparränder**. Regeln som överlevde är i stället: *tona OM den
  ton ytan hade, och låt aldrig ytan konkurrera med innehållet* — papprets toning är därför
  medvetet mycket svagare än planens, eftersom kritstrecken är innehållet där.
  ⚠️ **Ett tredje mönster, i två av tre spel:** de ritade ingen egen bakgrund alls utan lutade
  sig mot skalets `COLORS.bg` — en enda ton över hela skärmen. Så fort huvudytan slutar vara
  platt blir ramen spelets största fält. **En platthetsfix är inte klar förrän spelet äger sin
  egen yta.**
- **Oanvända riktiga ljud-klipp.** `audio.sample('djur_…')` (12 djurläten) finns men anropas inte i
  flera spel (t.ex. skuggmatchning, vandkort) — `vilket-djur-later` bevisar att de funkar. *Grepp:*
  koppla på de riktiga klippen där djur/föremål förekommer (genomgående [Quick] när de finns).

## Faser

Granskning sker i faser, ett spel i taget, doc + plan per spel. Förslag på fas-ordning:
fliksvis (Roligt → Fysik → Pussel → Lära) eller registerordning. Efter att planerna är
skrivna kan en separat omgång *genomföra* förbättringarna (commit per spel, samma
test→screenshot→commit-loop som tidigare). **Fas 1 (pågår):** `klambubblor` (exempel-doc
som sätter kvalitetsribban).
