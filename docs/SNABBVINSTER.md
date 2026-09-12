# SNABBVINSTER.md — kartlagda [Quick]-punkter som går att bygga utan ägaren

*Kartlagt 2026-09-12 (v1.250.0) av två läsande agenter som gick igenom varje `docs/games/<id>.md`
och prövade varje öppen `[Quick]`-punkt mot koden. **Inget här är byggt än** — kampanjen
planerades men hann inte starta innan sessionen tog slut. Radnummer gäller `src/games/<id>/index.js`
per 2026-09-12 och kan ha glidit; läs koden först (CLAUDE.md: "docens §4 kan vara inaktuell").*

Klass **A** = öppen, liten (≤ ~30 min), inget ägarbeslut, ingen ny röst (TTS nere), inget nytt
SFX-klipp (MOSS nere), inga foton, inget speltest. Tonerna är `audio.tone()` — stämda, aldrig
samplade UI-klick.

## ▶ Så körs kampanjen (planen som inte hann starta)

- **3 byggagenter samtidigt, ~8 spel var, tre vågor** (agentpolicyn: högst 3 samtidigt).
- **Agenterna redigerar men kör ALDRIG webbläsartester.** `registry.js` importerar alla 85 spel
  statiskt, så varje sparad spelfil laddar om VARJE öppen dev-sida — parallella tester medan
  någon annan sparar blir förfalskade (CLAUDE.md, fällan från 2026-09-12). `npm run check -- --game <id>`
  är statisk och går bra.
- **Koordinatorn testar när ingen redigerar:** `npm run test -- a b c …` per våg (eller `test:all`),
  granskar diffen, committar **ett spel per commit**.
- Varje ny tween dödas i `destroy()` — och spela minst TVÅ rundor (återspelssäkerhet ≠ exitsäkerhet).

## ⚠️ Buggklass att kontrollera i SAMMA pass: dubbelfirande som kapar repliker

`progress.complete()` spelar redan `sfx('celebrate')` + `voice.say(randomFrom(PRAISE))` +
`bigCelebration` (`GameHost.js:29-32`). Ett spel som gör samma tre saker i samma ögonblick får
dubbelt vinstljud, dubbel konfetti och en **kapad** replik (`say()` kallar `cancel()`).
**Bekräftat i koden:** `regnbagsmalaren:551-558`. Misstänkta: `spindelnatet:534-536/571`,
`vippbradan:722/744/751`, `siffertaget:499/508`. **44 spel** har både eget firande och
`complete()` i samma fil — många firar per runda och är oskyldiga, så pröva spel för spel.
Fix: stryk spelets egna kopior av de tre generiska sakerna; har spelet en EGEN replik i samma
ögonblick — anropa `complete()` FÖRST och köa repliken bakom berättaren (`_narTyst`-mönstret i
`unika-knytt:1426-1445`, som väntar in `voice.talar`/`voice.kvar`).

## A — första halvan (a–m)

| spel | punkt | var + vad | min |
|---|---|---|---|
| bajs-och-kiss | mikroskak efter storlek vid plopp | :744-749, `shake(this._root,{intensity:2+r/12,duration:0.25})` | 5 |
| balanstornet | rekordlinje på flaggstången | spara bästa höjd i custom i `_klarat` :902, markering i stångritningen :404-419 | 25 |
| balanstornet | knak per stödbredd | :718 fast 165→118 Hz → skala med `this._stodHalv` | 5 |
| blixt-och-dunder | regnbågen tänds per lampa | svaga band när byn byggs, en andel per `_lightLamp` :676-720 | 30 |
| bowling | klockspel vid strike | `_strike` :770-771, 2–3 toners durtreklang | 5 |
| bygg-tornet | mikroskak för tunga klossar | `_lockActive` :366-370 | 10 |
| elementlekplatsen | penselstorlek per element | `r` per post i VERKTYG :96-106, `v.r ?? BORSTE_R` i `_mala` :715/:727 | 10 |
| elementlekplatsen | ångan puffar vid taket | `automat.js:364` raderar ånga tyst → notera kolumnen, puffa efter `taHandelser()` :954 | 20 |
| elementlekplatsen | Bobo tittar på elden | `_ljudOchSken` :977, `look(m.x,m.y)` när inget finger pekar | 10 |
| elementlekplatsen | vattenslinga (porl) | klona eldslingan :972-976 som `brus`; stopLoop :546-547 | 25 |
| enhorning-glitterbajs | matmängd syns | `_feed` :454-466, två matningar före 0,6 s → en större prutt, tak MAX_PELLETS | 20 |
| enhorning-glitterbajs | stigande fångst-pling | `_catch` :592-596, pentatonisk kombo, nollas efter ~1,5 s | 10 |
| enhorning-glitterbajs | jackpot-pellet (gränsfall) | ~1/12 ritad stjärnpellet i `_fart` :522-537, +3 i `_catch` | 35 |
| enhorningen-elvira | klättringsljudet stiger | `_bounceFx` :853-854, tonsteg efter `this._bounces` | 10 |
| enhorningen-elvira | Elvira reagerar i luften | `_collectGem` :796-814 pop+floatText; väggträff :839-840 wiggle + floatText (ingen ny röst) | 15 |
| enhorningen-flyger | pip i ringens färg | `_lightPip` :310-314, ringens `color` :350 från passagen :539 | 10 |
| enkelt-pussel | stigande snäpp-ton + skak vid sista | :565 ton efter `_placed`; `shake` i `_finishRound` :581 | 10 |
| fallskarmen | boing + damm + skak på mattan | `_celebrate` :882-903 | 10 |
| fanga-frukten | kombo-ton + korg-squash | `_catchFruit` :512-515, räknare nollas vid miss :582 | 15 |
| fargregn | rätt droppar pulserar först | `_spawnDrop` :386-395, `breathe()` ~1,5 s för målfärgen | 20 |
| flugan-pa-nasan | fönstret stänger mjukt | `_stangFonster` :1226 `power2.in` → `power2.out`/`back.out(1.2)` | 2 |
| folj-sparet | husets fönster tänds med sekvensen | fönstren :169-172 i egen Graphics, lerp mot varmgult i `_onTap` :486-504 | 20 |
| fyrverkeri | rökpuff vid rampen | `_fire` :299-325 (`puff` ej importerad :23) | 5 |
| fyrverkeri | ibland en stor raket | ~1/6 `makeRocket(1.0)` :308, fler gnistor i `_explode` :432 | 25 |
| golvet-ar-lava | synlig samlad sträcka | rad ritade stenar per klarad flod, fri från skalets knappar | 30 |
| golvet-ar-lava | streck efter figuren i hoppet | en-Graphics-spåret från `enhorningen-elvira` | 20 |
| gungan | plockljud per måltyp | `_collectTarget` :704-724, ton per `tg.char` | 10 |
| gungan | whoosh klättrar + gnissel vid vändning | ton ∝ `_maxAbs`; strypt gnissel när `_omega` byter tecken | 15 |
| harma-melodin | synlig melodibok | rad ritade noter i `_onRoundComplete` :264 (nedre mitten upptagen :115) | 30 |
| kittla-figuren | rodnaden fördjupas | kinderna fast alfa :303 → skala/tona med `prog` i `_giggle` :473 | 10 |
| kla-pa-nallen | sällsynt fjäril på hatten | ~1/8 huvudplagg, `drawIcon('🦋')` vid huvudslot :38, flyger vid rundslut | 25 |
| klambubblor | mjuk tema-crossfade | `_build` :79-84 byter scen hårt; tona ut den gamla | 20 |
| knuffa-tornet | rasande-mur-kaskad | `_onClear` :1035-1080, ≥3 fall på ~1 s → EN stigande kaskad (se tweenflod-noten :1039) | 20 |
| knuffa-tornet | repspännljud | strypt ton ∝ kraft under draget (`_stretch` :822-824) | 15 |
| lagerelden | crossfade vid temabyte | `_nextFire` :1044-1055 | 20 |
| leksakslada | leksaksljud vid lyft | `_grepp` :563, ton per nyckel (anka pip, trumma duns, tåg tut) | 15 |
| leksakslada | Bobo reagerar vid autohjälp | `_hjalp` :1017-1030, `react('nyfiken')` + `look()` | 10 |
| loopdjuren | spara/återuppta loopen | `row.slots` i custom, återställ vid mount, vakt mot 4–6 fack :85 | 25 |
| loopdjuren | stämpelns ljud vid upplyft (D-posten omskriven) | stämplarna är DragController-föremål :244-249, ljud ur `_perform` :455 | 15 |
| magnet-fiske | egen rörelse per typ | tomgång på ett INRE barn: mynt snurrar, burk guppar, fisk vajar | 30 |
| magnet-fiske | droppar när magneten lyfts | blå puffar vid utgång ur vattnet :602-607 | 5 |
| mata-monstret | sällsynt jätte-godbit | `_serveShelf`/`_dropSlot` :409/:566, `_makeFood(key, s·1.5)` + extra tugg + skak | 30 |

## A — andra halvan (n–z)

| spel | punkt | var + vad | min |
|---|---|---|---|
| natskott-pa-stan | hemkomsthuset lever | `_mkHomeHouse` :5759-5787, dörr som egen nod + tänt fönsterlager; `later(2.1)` :5743 | 20 |
| passa-formerna | kören hoppar i takt | `_finish` :561, varje figur hoppar på sin `SKALA`-ton | 15 |
| passa-formerna | damm när locket smäller igen | `_buildRound` :229-232, tweena ned + puff + låg duns | 10 |
| passa-formerna | Bobo tittar mot hålet vid idle | `_update` :617 `look()` på `_hint.mal`, `react('nyfiken')` :655 | 10 |
| peka-pa-kroppen | reaktion per kroppsdel | `_correct` :641-663, bara toner (näsa pip, mage skak, fot drill …) | 20 |
| plantera-fron | sällsynt jätteblomma | `_bloom` :744-786, ~1/6 skala 1,35 (ingen fjäril — reserverad för finalen) | 15 |
| plask-i-vattnet | ankan kvackar | `_splash` :972-998, syntetiserat kvack + wiggle | 20 |
| poppa-ballonger | pop-efterklang | `_pop` :494-583, tonande skiva + gummibitar + skak ∝ `b._size` | 20 |
| rakna-applen | korgen reagerar | `_basketBounce` :486/:535 skala med `_count/_target`; pricksvep vid mål :492 | 10 |
| regnbagsmalaren | spår av tidigare regnbågar | `min(regnbagar,3)` svaga bågar under `_rainbow` (custom finns :560) | 20 |
| roliga-snurran | transponera treklangen per runda | `REEL_TONES` :121 × [1, 4/3, 3/2][_round%3] vid :745/:774/:796/:812 | 10 |
| siffertaget | slumpad loksfärg | `_buildEngine` :211/:216 färgparameter, bygg om i `_newRound` :396 | 15 |
| siffertaget | koppelsnäpp | `_onCorrect` :459-489, klick-ton + damm + ryck | 10 |
| skattjakt-i-morkret | fanfar för saken under katten | `offer._underKatt` :444, arpeggio i `_upptack` :859 | 10 |
| skattjakt-i-morkret | reaktion per sak vid fynd | `_upptack` :859-874, tabell per `SKATTER` :90 | 20 |
| skattjakt-i-morkret | Bobos egen lykta (gränsfall — ändrar ledtrådar) | lykta vid `BOBO_POS` :80, alfa efter avstånd | 30 |
| skuggmatchning | sällsynt gyllene skugga | `_newRound` :170-211, ~1/6 (befintlig berömrad, ingen ny röst) | 20 |
| snobollen | knuffladdning syns | glödring under `_ballArt` ∝ fart | 15 |
| snobollen | skak vid stora smällar | :1343-1352 `shake(this._root)` — INTE `_world` (kameran skriver dess x) | 5 |
| sortera-skrap | sällsynt guldskräp | `_buildRound` :282 / `_makeItem` :825 / `_onCorrect` :381 | 20 |
| spara-linjen | färgtonade prickar | `_makeDot` :664-673, alfa-ramp längs banan | 10 |
| spindel-zacke-svingar | boing när pendeln vänder | :1206-1209, strypt ton när `_omega` byter tecken och \|θ\|>0,3 | 10 |
| spindel-zacke-svingar | Elvira vinkar längs vägen | armen :696-697 som egen nod, amplitud ∝ framsteg | 15 |
| spindelhjalten | stjärnor i former | `_layoutFor` :207-250, ~30 % båge från nivå ≥1 | 15 |
| spindelhjalten | bandspänn-ljud | `_tension` :920-927 strypt stigande ton + "tjong" i `onLaunch` :165 | 15 |
| spindelhjalten | studsknoppen reagerar mer | :909-912 `ripple` + `sparkle` | 5 |
| spindelnatet | sällsynt guldgodis | `_landInNet` :458-472, ~1/10, dubbel mätare | 20 |
| spindelnatet | scenvariation per nivå | månfas `_level%4` + några eldflugor | 25 |
| spindelnatet | nätet reagerar | `squash` på `_web` (tick skriver bara x :180) | 5 |
| spindelnatet | trådens indrag med översläng | `_reelIn` :430, kort `back.out` | 5 |
| spindelnatet | mätaren bågnar vid full | vinstmetoden :530-571 `pop(_meterLayer,{scale:1.25})` | 5 |
| spindelnatet | Bobo som hejar | `makeKaraktar`, `heja` per fångst, `jubel` vid full mätare | 20 |
| stor-liten | sällsynt jätte/pytte | 1,3× `SIZES.stor` / 0,75× `liten` :34-49 — på konsten, inte träffytan | 20 |
| studsa-ner | stjärnficka | ~1/5 rundor guldkant på `_targetIdx` :473, två mätarsteg | 25 |
| studsbollar | synlig samling (gränsfall) | `custom.korgar` :744 visas aldrig — hink som i `studsa-ner` | 30 |
| studsmatta | gyllene jättemorot | `_spawnGoals` :440-456, ~1/6, 1,4×, räknas dubbelt | 20 |
| studsmatta | höjdton | studsen :351 glidande ton; fallande när `velocity.y` byter tecken | 15 |
| studsmatta | kaninens ögon följer målet | `makeBunny` :863-866, pupiller som egna noder | 25 |
| tarta-i-ansiktet | varierad splat-form | :647 ellipser + satellitdroppar, behåll `_r` för `_rub` :768 | 10 |
| tarta-i-ansiktet | mikroskak efter träffen | `_splat` :619, skak ∝ `_splats` | 5 |
| tarta-i-ansiktet | skrubbkänsla | `_rub` :756-783, strypt bubbelpuff + gnissel-ton | 15 |
| titt-ut-pappa | skvaller för lampa och kruka | `MOBEL_LJUD` :72-78, klirr + prassel; mät med `_gommaprobe` | 10 |
| tryck-och-forvandla | temarundor | `_pickChains` :146, ibland djur- eller himmelstema | 15 |
| tryck-och-forvandla | starkare slutpose per sak | slutsteget :244-284, tabell per sak | 20 |
| tvatta-djuret | badtillbehör per djur | per `TYPES` :78 (kolla `drawIcon`-nyckeln — saknad nyckel = grå cirkel) | 20 |
| tvatta-djuret | "renare"-ton som stiger | :788 `tone(440+_renhet()*440)` per borttagen klump | 10 |
| tvatta-djuret | rosett vid finish | djurets egen finish (doc anger :905-912) | 15 |
| tvatta-djuret | djurläte när duschen låses upp | `_revealShower` :994-1002, `audio.sample('djur_'+type.sample)` | 5 |
| vad-forsvann | visa klarade rundor | `custom.rundor` :651, rad ritade stjärnor (max ~10) | 20 |
| vakna-pappa | egna ljud för kittla och kaffe | `_kaffe` :1159 / `_kryp` :1131, egna toner i stället för `soft` | 10 |
| valpens-bajs | skyffelns vikt + skrap | :652-662, sänk ett INRE barn (inte den dragna noden) + skrap-ton | 15 |
| valpens-bajs | variera bajs och fynd | `_spawnPoop` :530-557, skala inre `g` 0,8–1,25 (inte `pile`, hitArea 60 px) | 20 |
| valpens-bajs | surr som signal | `_addFlies` :576-595, andra våg efter ~10 s | 10 |
| valpens-bajs | parkspecifik finish | `_finish` :940-973, fåglar + blommor + valpen rullar | 25 |
| vandkort | temaljud vid avslöjande | `_showFace` :350-365, ton per `_set.kind` (inte under tittfasen) | 10 |
| vandkort | mjuk tema-crossfade | `_build` :80-104 | 20 |
| vart-tog-det-vagen | trumvirvel före gissningen | `_beginGuess` :377-385, 8–10 accelererande tick | 10 |
| vart-tog-det-vagen | mjukare autohjälp i två steg | `_update` :587-599 — kör `_idleprobe` | 15 |
| vilket-djur-later | vinnardjurets egen gest | `_speak` :345, tabell per `id` | 20 |
| vippbradan | grodkör i korgen | `custom.landningar` :750, små grodor (max ~6) | 25 |
| vippbradan | kväk vid landning | `_land` :726, syntetiserat kväk | 5 |
| zackes-biltvatt | fler karossfärger | :39-46 / :815, brandbilen förblir röd | 10 |
| zackes-biltvatt | munstycket kryper hem (osäker på slang-API) | styr `_hoseTarget` mot stolpen efter N s | 20 |
| zackes-biltvatt | Zacke reagerar mer | `_zackeCheer` :1339-1344, tumme upp + torka pannan | 20 |

## C — redan byggt men står som öppet (stryk i docsen)

~70 punkter i första halvan och 7 i andra. Exempel med bevis: `bowling` (spare :694 · riktmärken
:207 · banteman :54 · kombo-ton :63-65 · STRIKE+skak :321-329 · kantstöd :216-241) ·
`borsta-tanderna` (hela §4 är byggd) · `gravmaskinen` (6 punkter) · `roliga-snurran` (spara
symboluppsättning :198) · `trollblandning` (hyllträngseln, två rader sedan v1.143.0) ·
`sapbubblor` (glans/ton :476-491, levande maskiner :878-882). Agentrapporterna med full
bevislista fanns bara i sessionen — kör om kartläggningen per spel när docsen städas.

## D — premissen föll (skriv om eller stryk)

`domino` längre bana (ägaren capade den 2026-08-11) · `flugan-pa-nasan` inspelningslista (alla
klipp finns) · `harma-melodin` riktiga toner via SFX (de stämda tonerna ÄR de riktiga) ·
`rakna-applen` sifferigenkänning (siffran syns redan) · `roliga-snurran` pilla på stillastående
trumma · `skattjakt-i-morkret` två saker bakom samma möbel (inga möbler i mörkret) ·
`sortera-skrap` scen-crossfade (en scen) · `vart-tog-det-vagen` barnstyrt tempo (långtryck, P0) ·
`vilket-djur-later` rotera djurpoolen (alla 12 visas redan).

## Sidofynd (omätta)

- `plantera-fron`: blomhuvudet är en emoji-`Text` i storlek 92 (:521) ovanpå ritade kronblad —
  tillåtet som detalj enligt P0 ASSETS, men värt en blick.
