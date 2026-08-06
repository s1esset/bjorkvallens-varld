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

## 2026-08-06 · v1.11.0 · 🔤 Lära-fliken polerad — **poleringsrundan 70/70 KLAR**

**Byggt:** hela 🔤 Lära-kön (9 spel) körd i ett svep med checkpoint mellan varje. Därmed är
**hela poleringsrundan avslutad**: alla 70 spel är genomgångna (🎉 15 · ⚙️ 27 · 🧩 19 · 🔤 9).

- **P0 ASSETS i sex av nio spel.** `vilket-djur-later` (12 djur), `kla-efter-vadret` (13 plagg
  + vädertecknet), `ballonglyft` (Elvira, presenten, 8 överraskningar), `siffertaget`
  (vagnslasten), `blixt-och-dunder` (lamporna + mätaren) och `djurorkester` (6 djur) ritade
  emoji som spelobjekt. Greppet från Pussel-rundan höll: **behåll emoji-strängen som NYCKEL**,
  byt bara renderingen.
- **`artikoner.js` växte med 25 nycklar.** Fem bondgårdsdjur (får · häst · anka · höna · tupp),
  kyckling, en helt ny `wear`-mall med 17 plagg i 12 former, och två vädertecken (regnmoln,
  snöflinga). **🐮 kon ritades om** från grunden — den gamla var en vit cirkel med runda öron
  och läste som isbjörn; nu horn, breda öron, fläck och mule. Den syns i fem spel.
- **Nytt verktyg `scripts/_ikoner.mjs`** — ritar valda nycklar i ett rutnät och skärmdumpar.
  Det var det som avslöjade att kon, hästmanen, hönskammen, ankan, regnhatten, regnjackan,
  sandalen och halsduken var svaga. Sandalen fick tre försök innan den slutade läsa som en
  bänk; lösningen blev att rita den **ovanifrån** medan övriga skor är sidovy.
- **Fyra äkta spelbuggar** som gröna test aldrig sett, alla hittade i skärmdumpen:
  - `kla-efter-vadret`: ett plagg spawnade alltid på x=640 — ovanpå Elvira OCH inuti
    fot-zonens Ø260 träffyta. En liten knuff kunde räknas som en placering barnet aldrig gjort.
  - `ballonglyft`: en ballong spawnade bakom presenten och gick inte att hitta — rundan kunde
    då bara lösas av auto-hjälpen. Dessutom klipptes ballongsnörena av nederkanten.
  - `rakna-applen`: två frukter hängde i ren himmel, 192 px från närmaste lövboll (radie 156).
  - `blixt-och-dunder`: Bobos fötter hamnade på y=731 — utanför 720-skärmen.
- **Bobo var ett svävande huvud** i `blixt-och-dunder` (`makeMascot()` ger bara ett huvud —
  samma fynd som i fem Pussel-spel). Ny `makeBoboBody()`.
- **Två mottagare tillagda** (gate-punkt 4): en ritad **ekorre** i `rakna-applen` vars kinder
  rodnar gradvis mot antalet i korgen, och en ritad **Elvira med kropp** i `ballonglyft`.
- **Röstbuggarna borta — repo-kontrollen är 0 fel och 0 varningar för första gången.**
  `peka-pa-kroppen` byggde alla sina frågor med `.replace()` på mallsträngar och `fargregn`
  med strängkonkatenering; klipp-manifestet slår upp på exakt text, så spelens KÄRNREPLIKER
  föll tillbaka på Web Speech. **Alla 100 fanns redan i `voice-phrases.json`** — det var
  källkoden som gjorde dem onåbara. Nu fulla literaler i uppslagstabeller. 11 → 0 varningar.
- **`fargregn` fick sin [Medium]-punkt:** pölarna bär nu färgen som landade i dem, och två
  OLIKA grundfärger i samma pöl blandas synligt (gul+blå→grön, röd+blå→lila, röd+gul→orange)
  med gnistor, stigande ton och talad förklaring. Sällsynt eftersom målfärgen dominerar regnet
  — ett wow-ögonblick, inte en mekanik barnet måste hantera.

**Commits:** `35bf5ab` vilket-djur-later · `208e6fe` kla-efter-vadret · `ef49053` ballonglyft ·
`e6d75a8` siffertaget · `fee4f68` blixt-och-dunder · `17cd80e` djurorkester · `a39c26a`
rakna-applen · `a6b0d75` peka-pa-kroppen · `81b1b7f` fargregn
**Kontroll:** `npm run check` **0 fel · 0 varningar** · `npm run test:all --jobs 2` **70/70
gröna** · bygge rent.
**Öppet:** 15 repliker väntar på `/rost` (12 sedan tidigare + 3 nya färgblandnings-repliker).
Fyra `sfx`-prompter väntar fortfarande på att MOSS är uppe. `ballonglyft`s
`_attachLoose(ctx, b, opts)` tar emot `{ auto: true }` men läser aldrig `opts` — auto-hjälpens
fäste går inte att skilja från barnets eget tryck; noterat i spelets doc §4, inte ändrat.

---

## 2026-08-06 · v1.10.0 · 🧩 Pussel-fliken polerad — 19 spel, ett delat ikonbibliotek

**Byggt:** hela 🧩 Pussel-kön körd i ett svep, ett spel i taget med checkpoint mellan varje.
Poleringsrundan är därmed **61/70** — bara 🔤 Lära (9) återstår.

- **P0 ASSETS var skulden, och den var värre än mätt.** 18 av 19 spel hade emoji som
  spelobjekt, oftast som *emoji-Text ovanpå en opak vit skiva* — dubbelt brott mot regeln.
  Rensat i samtliga: 60 kortsymboler (`vandkort`), 44 figurer (`skuggmatchning`), 32 sopor
  (`sortera-skrap`), 23 plagg (`kla-pa-nallen`), 16 element (`trollblandning`), 16 motiv
  (`vad-forsvann`), 33 figurer (`stor-liten`), hela sakkatalogen i `magnet-fiske`, m.fl.
  Greppet som funkade genomgående: **behåll emoji-strängen som NYCKEL** — spelen slår upp
  namn, djurläten och kategori på den — och byt bara renderingen.
- **Nytt delat bibliotek `src/lib/artikoner.js`.** Efter tre spel med överlappande figurer
  bröts ritmotorn ut ur `vandkort`: `drawIcon(key, size)` med parametriska mallar (djur ·
  frukt · fordon · form · havsdjur · verktyg) drivna av en tabell, ~110 nycklar. Fem spel
  använder den. En genomsökning verifierar att varje nyckel spelen slår upp finns i tabellen
  — saknade nycklar faller igenom till en grå cirkel som ser ut som ett medvetet designval
  i skärmdumpen. Fjäril, regnbåge och fotboll hann göra just det.
- **Fem svävande huvuden fick kroppar:** trollkarlen (`trollblandning`), Elvira
  (`kugghjulen`), de fyra djuren (`folj-sparet`), Zacke/Alissa (`golvet-ar-lava`) och Bobo
  (`kulbana`). `makeMascot()` ger BARA ett huvud. I `trollblandning` ritades kroppen redan
  men syntes aldrig: faceR 80 ger en 160 px bred ansiktscirkel som täckte hela bålen.
- **Tre spel fick en mottagare** (gate-punkt 4): draken vid skatten (`golvet-ar-lava`), Bobo
  vid hinken (`kulbana`) och katten vid hinken (`magnet-fiske`).
- **`golvet-ar-lava` fick sin [Deep]-punkt:** en prickad förhandsvisning av hoppbanan som
  ritas om vid varje stenflytt. `_buildSeq()` och `_arcHeightFor()` delas av förhandsvisningen
  OCH det verkliga hoppet, så de kan aldrig säga olika saker. Vit bana = figuren klarar det
  själv, blek blå + molnmarkör = hjälpmolnet får bära.
- **Sju layoutfel som bara syntes i skärmdumpen:** Gå!-knappen mitt i lavafloden; magnetspöets
  pivot rakt under ljudknappen (spöet drogs tvärs igenom den); L-kugghjulet klippt av
  skärmkanten; hinkens botten bakom Delar-hyllan; Bobos armar ritade före bålen så de doldes
  helt; 3D-mottagaren halvt utanför vänsterkanten; och ett sista kliv som gick **bakåt** på
  breda banor i `golvet-ar-lava` (`treasureNodeX` kunde hamna vänster om `rightLandingX`).
- **Fem röstbuggar** där repliker aldrig kunde få klipp: `voiceIntro` som pekade på en konstant
  i stället för att stå skriven på plats (`sortera-skrap`, `stor-liten`) och konkatenerade
  strängar (`folj-sparet`, `enkelt-pussel`, `mata-monstret`). check.mjs matchar **bara
  literaler**. Repo-varningarna gick från 16 → 11.

**Sidospår på begäran:** `p2-es` tillagd som tredje fysikmotor — verifierad funktionellt
(låda faller och landar i ett röktest) och bundlar till 66 KB, dynamiskt importerad så bygget
är oförändrat. Skill **fysik-spel** har fått en motorvalstabell först i dokumentet: egen
ticker-integrator · matter · p2 · three, plus regeln en motor per spel. Spelindexet städat —
`kvalitet` och `polerad` är nu **två** kolumner i stället för en överlastad emoji, och 42
spel-docs synkade mot indexet. Ny idébank `docs/IDEER.md` med förstapersons-nätskottsidén.

**Commits:** 19 spel-commits · `a9fd079` idébank · `dbd506a` index · `936c8c3` p2-es
**Kontroll:** `npm run check` 0 fel · 11 varningar · `npm run test:all --jobs 2` **70/70
gröna** · `test:fx` grön · bygge rent.
**Obs för nästa körning:** med `--jobs 4` faller `glittergrottan` på slut på WebGL-kontexter —
det är harnessen, inte spelet. 3D-spelet behöver ~13 s innan det renderar, så en tom skärmdump
betyder inte att något är fel.
**Öppet:** 🔤 Lära-fliken (9 spel) är sista kön i poleringsrundan. 12 repliker väntar på
`/rost`. Fyra nya `sfx`-prompter (`duns` m.fl.) väntar på att MOSS är uppe.

---

## 2026-08-05 · v1.9.0 · 🔊 Röstkön tömd — 343 nya klipp

**Byggt:** `/rost` körd skarpt. Hela kön av svenska repliker har nu riktiga F5-TTS-klipp.

- **Var pipelinen faktiskt finns.** Utgångsfrågan var om Holodeck-projektet har en F5-pipeline
  vi kan låna på psai3. Det har det **inte**: Holodecks TTS är **Chatterbox** (devnen-servern,
  Turbo-engine) på **PC 2 "andreas-hem"** `192.168.1.125:8004`, och V3 är **engelska only** sedan
  2026-06-26. `HoloDeck_V2/TTS_RESEARCH_2026-06-26.md` utvärderade F5-TTS och valde bort det.
  psai3 förekommer bara som filutdelning i de dokumenten. **Den svenska F5-pipelinen låg redan
  där `npm run voice` pekade**: storygen-narratorns venv här på psai1 (torch 2.6.0+cu124, RTX
  4090, `EkhoCollective/f5-tts-swedish` 3,2 GB i HF-cachen — inget nätanrop behövs).
- **72 repliker som spelen säger** men som saknades i `voice-phrases.json` lades till först, så
  de kom med i samma körning. Resultat: **351 gjorda, 1051 överhoppade, 0 misslyckade.**
- **Skräp rensat.** `_addphrases.mjs` lägger till precis vad `check` rapporterar — även bitar av
  mall-strängar (`" dropparna!"`, `"Hurra! "`) och rena **platshållare** (`"Hitta {d}!"` från
  `peka-pa-kroppen`). Åtta platshållare hann få klipp där rösten läser upp `{d}` högt innan de
  upptäcktes. Klipp, manifest-poster och repliker borttagna; fällan dokumenterad i
  `docs/POLERINGSRUNDA.md` intill verktyget.
- **Kvalitetskontroll:** alla 351 nya klipp mätta med `ffprobe` — 0,98–8,47 s, median 2,60 s,
  inga avhuggna eller skenande, 0 manifest-poster utan fil. Täckning nu **1394 repliker /
  1395 klipp, 0 utan klipp**.

**Buggfix i verktygskedjan:** `npm run voice` och `npm run sfx` var **trasiga på Windows**. npm
kör sina scripts genom cmd.exe, och cmd klarar inte en kommandorad som *börjar* med en citerad
sökväg och sedan har fler citerade argument — den svarade "Felaktig syntax för filnamn,
katalognamn eller volymetikett" och körde aldrig något. Varken snedstreck eller bakstreck
hjälpte (skill-dokumentationens råd "kör från PowerShell" räckte alltså inte). Ersatta med
`scripts/run-tts.mjs`, som spawnar python med en riktig **argv-array** — ingen shell-citering
alls. Fungerar nu från både PowerShell och git-bash, kör `python -u` så framstegsraderna
strömmar live i stället för att buffras till slutet, och ger ett begripligt fel om venven saknas.

**Commits:** `b6f1d8a` feat(voice) · `11f4de9` chore v1.9.0
**Kontroll:** `npm run check` 0 fel · 16 varningar · bygge rent (precache 1450 poster, 25 MB,
1395 röstklipp i `dist/`).

**Öppet:**
- De 16 varningarna är **läcka #4-skuld i opolerade spel**: `fargregn`, `enkelt-pussel`,
  `folj-sparet`, `mata-monstret` och `peka-pa-kroppen` bygger repliker ur mall-strängar, och
  `sortera-skrap` + `stor-liten` saknar `voiceIntro`. Fixas i respektive spels poleringsomgång
  (Kö 2 🧩 Pussel och Kö 3 🔤 Lära, 28 spel kvar) — inte genom att lägga fragment i röstlistan.
- MOSS-SoundEffect (:8003) är fortfarande nere → 21 sfx-klipp, `npm run sfx` väntar. Modellen
  ligger cachad lokalt, så det är bara tjänsten som behöver startas.
- Referensrösten är fortfarande `narrator_default.wav` med ett **engelskt** transkript. Det har
  gett 1395 dugliga svenska klipp, men en svensk referens är den enda kvarvarande kvalitetsspaken
  — och den kräver att **alla** klipp görs om, inte bara nya.

## 2026-08-05 · v1.8.0 · 🎉 **Roligt-fliken KLAR** (14/14)

**Byggt:** poleringsrundans Kö 1 färdig — de nio återstående spelen i 🎉 Roligt, ett i taget med
skärmdumpsgranskning, `_idleprobe` och egen commit. Rundans genomgående fynd:

- **P0 `ASSETS` läckte i sex av nio spel, och alltid på samma sätt:** ett spelobjekt var en emoji
  i en ruta, cirkel eller bricka. `lagerelden` (🪵-ved), `enhorning-glitterbajs` (🍓🧁🍪 i en vit
  panel), `loopdjuren` (fyra djur i cirklar + fem block i fyrkanter), `regnbagsmalaren` (🦄 som
  pensel + 🌸🌷🌼), `fyrverkeri` (✨/⭐ som målstjärnor) och `tryck-och-forvandla` (**alla 25
  förvandlingssteg**). Allt är nu ritat med egen silhuett. Inga `Text`-noder kvar i något av de
  nio spelen.
- **Elfte läckan — "loggen ljuger".** `enhorning-glitterbajs` doc §5 påstod sedan 2026-07-01 att
  maten ger olika glitter. Men `makePelletView()` **tog inget argument** och ignorerade
  `_glitterKind`, så alla tre maträtterna gav identiska gula prickar. Ett grönt test och en
  nöjd logg-rad räcker inte: *verifiera att den påstådda kopplingen faktiskt går hela vägen
  fram till pixlarna.*
- **Tolfte läckan — framsteg vid INGÅNG.** `tryck-och-forvandla` anropade `progress.setLevel()`
  i `init`, före första trycket, så `_idleprobe` gav `idleFramsteg: 1` utan en enda beröring.
  Regel: progress skrivs när barnet klarat något, aldrig när spelet startar.
- **Läcka #6 (`arc()` efter `fill()`) igen, två gånger.** I `enhorning-glitterbajs` drog den ett
  långt streck från containerns origo tvärs över hela enhörningen (syns tydligt i skärmdumpen);
  i `tarta-i-ansiktet` fanns samma fel latent i clownens mun men doldes av näscirkeln som ritas
  efter. Leta efter `.arc(` som första vägkommando efter `.clear()` eller `.fill()`.
- **Läcka #4 (konkatenerade repliker) i tre spel** — `tryck-och-forvandla`
  (`` `${st.a} ${st.n}!` `` för alla tio resultat), `kittla-figuren` och `lagerelden`. Alla
  omskrivna som hela literaler så `/rost` kan generera klipp.
- **Element bakom skalets hörnknappar, två fall:** `enhorning-glitterbajs` mätarstjärna på y 116
  och `fyrverkeri` vindflagga på (96, 96) — båda delvis under knapparna som når y ~112.
- **Scener som svävade:** `lagerelden` hade hela lägerplatsen 64 px ovanför marklinjen
  (`createScene` ger 96 px mark), och Elvira i `enhorning-glitterbajs` stod 80 px över marken.

**Utöver P0** fick varje spel ett riktigt lyft: lägerplats med tält och eldflugor och fyra sorters
mat att rosta; äkta glitterskillnad per mat; stämda instrumentblock med ritade djur; överraskningar
som flyger ur varje färdig regnbågsbåge; måne, stadssiluett och en publik som ropar "Oooh!" i
fyrverkeriet; levande, driftande bubblor med Bobo som samlar fångsten i en burk; kittel-ledtråd i
fritt läge och skrattårar; och en riktig cirkusscen med ridåer, publik och fyra tårtsorter.

**Commits:** `5909607` lagerelden · `ce7d4cc` enhorning-glitterbajs · `4d5fb57` loopdjuren ·
`2d7bc14` regnbagsmalaren · `ecdd289` fyrverkeri · `1494b6c` tryck-och-forvandla ·
`b0df504` klambubblor · `ea0d70e` kittla-figuren · `67830b9` tarta-i-ansiktet

**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `_idleprobe` på alla
nio: `idleFramsteg: 0`.

**Öppet:**
- Poleringsrundan fortsätter med **🧩 Pussel (19 spel)** och **🔤 Lära (9 spel)** = 28 kvar.
  Tabellerna i `docs/POLERINGSRUNDA.md` är avbockade för hela Kö 1.
- **199 repliker väntar på röstklipp** (upp från 136) — kör `/rost` när F5-TTS-narratorn är uppe.
  76 av `npm run check`-varningarna är den kön, samtliga i spel som ännu inte polerats.

## 2026-08-05 · v1.7.0 (pågående) · 🎉 Roligt-fliken, spel 4 av 14

**Byggt:** `sapbubblor` polerad — fjärde spelet i poleringsrundans Kö 1. Rundans stora fynd den
här gången är inte ett assets-brott utan ett **designfel som gröna tester aldrig ser: spelet
spelade sig självt**. Kritiker-agenten lät spelet stå orört i 60 sekunder och mätte en hel nivå
klar efter 10 s, utan ett enda tryck. Orsaken var två samverkande saker som är osynliga både i
koden och i skärmdumpen: var tredje bubbla föddes i ringens lodräta korridor, och "suget" mot
ringen hade en radie som var bredare än den ser ut. No-fail hade glidit över i att barnets input
är dekoration. Nytt verktyg `scripts/_idleprobe.mjs` mäter det: nollställer progress, rör inget
i N sekunder, spelar sedan riktat. Efter fixen: **20 s utan input = 0 framsteg**, 30 s riktat
spel = full ring, och no-fail-ventilen kliver in först runt 40–50 s.

Själva omgången: blåset är **riktat** (tryck i himlen → närmaste fläkt vrider sig dit och föder
en vindpuff som färdas längs siktlinjen och knuffar bubblor i båda axlarna, kraft delad med
massan), **Bobo håller ringen** och gapar/sväljer/hoppar, en **poppad bubbla släpper en
barnbubbla** så leksaken och målet hänger ihop, och alla emoji-spelobjekt är ritade — inklusive
åtta överraskningsfigurer i `overraskningar.js`. Dessutom sjätte läckan igen (glans-bågar utan
`moveTo` drog streck tvärs över varje bubbla), sjunde läckan (bubblor osynliga mot ljus himmel),
avklippta fläktstativ, träffyta 80–96 px på barnbubblor, och en arm som lossnade när Bobo hoppade.

**Commits:** 3d88ede feat(sapbubblor): riktat blås, Bobo håller ringen, 8 ritade överraskningar

**Öppet:** Kö 1 fortsätter med `pruttbad` (skuld 10) → `lagerelden` → … 10 spel kvar i Roligt,
sedan Pussel (19) och Lära (9) = **38 av 70 kvar**. Versionsbump, `npm run build`/`serve` och
`npm run backup` sker när hela Roligt-fliken är klar (se `docs/POLERINGSRUNDA.md`). Två nya
röstrepliker väntar på klipp — kör `/rost` när F5-TTS-narratorn är uppe.

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
