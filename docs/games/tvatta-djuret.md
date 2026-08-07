# Tvätta Djuret (`tvatta-djuret`)
> ⚙️ motorik · drag · 2–4 år · status: ✅ marknadsklar (2026-08-07)

## 1. Nuläge (sett som spelare)

En äng med ett blått badkar i mitten. Där står ett gladlynt men **lerigt djur** (Alissas
ponny → en glad gris → Lovas valp, cyklas per nivå) helt täckt av bruna lerklumpar. Nere i
hörnen ligger en **svamp** 🧽 (som "andas" — börja här) och en **dusch** 🚿 (halvtransparent/
inaktiv tills mest leran är borta). Överst en renhets-mätare med 🧼-ikon.

Jag gör djuret rent i två steg: **dra svampen** över kroppen → lerklumparna under suddas bort
(dubbel-lager-lera ljusnar först, försvinner på andra passet) och varje borttagen klump lämnar
en vit **skum-fläck**; när ~70 % är skrubbat tonar **duschen** in (+ röst "Ta duschen och
skölj"). **Dra duschen** → egna vattendroppar (en exit-säker ticker-integrator) regnar och
sköljer bort skummet med gnistror. Renhet = 0,6·skrubbat + 0,4·sköljt; när all lera är borta
OCH allt skum sköljt → djuret **skakar av sig vatten**, glittrar, ett djurläte (`sample`),
klistermärke + nästa (lerigare) djur. Tap-tap-fallback: tryck ett verktyg → tryck på djuret.

No-fail: dra utanför djuret ger bara en mjuk bubbla; skrubb går bara framåt, mätaren sjunker
aldrig; idle-vink (~6s) + auto-hjälp (efter ~9s utan framsteg städas närmaste fläck själv)
garanterar 100 %.

**Funkar bra:** den taktila "sudda fram ren päls"-känslan är genuint tillfredsställande; det
tvådelade verktygsflödet (skrubba → skölj) med duschen som låses upp lär ut en sekvens utan
ord; de egna vattendropparna ser fina ut; djur-cykeln + dubbel-lager-lera ger variation;
exit-säkert. En varm, lugn motorik-MVP.

*(Skärmdump: lerig ponny i badkaret, en bortskrubbad svada med vit skumfläck, svamp nere till vänster, dimmad dusch nere till höger, mätare överst.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: en **mys-omsorg** i två tydliga steg (svamp suddar lera → dusch sköljer skum),
där *båda* krävs för 100 % — en enkel sekvens som lär ut "först tvätta, sen skölja". Det
pedagogiska: omsorg, kroppsdelar, orsak-verkan i taktil rengöring; noll precision (generösa
radier, tap-tap-fallback). Designen betonar att skrubb bara går framåt och att 100 % alltid
nås (idle-vink + auto-städ), och att fel-drag är mjukt (bubbla). Lerklumpar/skum suddas via
{}-proxy-mönstret, droppar i en egen ticker-integrator — allt exit-säkert. Djuren cyklas
(ponny/gris/valp) med stigande lerighet; bara Alissa/Lova är namngivna människor (djur undantas).

## 3. Vad gör det lättjefullt / tunt

- **Det är en "färglägg/sudda"-yta, inte ett djur som känner något.** Leran är ett rutnät av
  jittrade klumpar (`_genMud`) ovanpå en blobbig silhuett av ellipser. Djuret under är en
  statisk form med en emoji-min — det **rör sig inte, ryser inte under svampen, blundar inte
  njutande, blir inte kittlat**. Man tvättar en form, inte en varelse. Ansikts-emojin döljs
  dessutom ofta helt av lera tills slutet.
- **Två steg, men samma enda interaktion.** Skrubba och skölja är båda "dra verktyget över
  ytan tills mätaren fylls". Ingen tajming, inget val, ingen ordning som spelar roll utöver
  upplåsningsgränsen — det är samma svep-gest två gånger med olika partikel.
- **Auto-hjälpen städar åt en utan att vänta länge.** Efter bara ~9s utan framsteg städas
  närmaste fläck automatiskt (`_autoHelp`), och så vidare — ett barn som pausar ofta ser
  spelet rengöra sig självt. Snäll garanti, men låg tröskel till passivitet.
- **Insudd-känslan saknar materialitet.** Klumpar bara tonar/krymper bort; ingen lera som
  smetar, klibbar, samlas på svampen, eller droppar. Svampen blir aldrig brun/smutsig, behöver
  aldrig sköljas — den är en magisk suddgummi.
- **Skummet är frikopplat från vatten.** Skum dyker upp där lera fanns och sköljs av valfri
  dusch-beröring; det rinner inte, samlas inte, bubblar inte. Vattendropparna är fina men
  "landar" mest som en trigger för `_rinseAt`.
- **Badkaret och ängen är inert kuliss.** Inget vatten skvalpar, inga badleksaker, ingen anka,
  ingen ånga/tvålbubblor som stiger. Scenen är en platt bakgrund + ett halvtransparent kar.
- **Vinst = delad celebration** + en skak. Den fina `shake` + droppring är spel-nära, men
  toppas av generisk `bigCelebration`; ingen "rent & stolt djur"-finish (rosett, parad, djuret
  beundrar sig i en spegel/vattenyta).
- **Ljudet är tunt/syntat.** `soft`/`pop`/`whoosh` för skrubb/skölj; djurlätet (`sample`) spelas
  bara vid vinst (tyst fallback om klippet saknas). Ingen mysig "gnugg"-textur, inget rinnande
  vatten, ingen stigande "renare-och-renare"-ton.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Djuret reagerar på beröring.** Liten rys/skälvning + glad/njutande min under
  svampen, blund vid sköljningen, ett "kittlat"-hopp om man gnuggar samma ställe — gör formen
  till en varelse. Allt på egna tweens (döda i destroy).
- **[Medium] Ge svampen materialitet.** Låt svampen samla brun lera (blir smutsig), och låt
  duschen även skölja svampen ren — ett litet extra orsak-verkan-moment som motiverar
  två-verktygs-flödet bortom en upplåsningsgräns.
- ~~**[Deep] Smutsiga zoner med olika behov.**~~ ✅ 2026-08-07 — **den här omgången.** Två
  lersorter: **torr lera** (varm brun, matt) skrubbas som förut, **kladdlera** (kall skiffer-
  blå, blank dager + rinnande droppe) biter svampen inte på — den måste **sköljas mjuk** med
  duschen först, sen skrubbas. Kladden ligger i 1–3 **zoner** på kroppen (inte utspridda
  prickar), andelen växer med nivån med tak, och nivå 0 är helt kladdfri så svampen lärs in
  ensam. Duschen är inte längre låst bakom 70 %-regeln när kladd finns. Mätt med
  `scripts/_tvattprobe.mjs`: **8/8**. *(Tovor/kamma byggdes inte — två material räcker för
  att göra valet äkta, ett tredje verktyg hade blivit mer att lära sig utan mer djup.)*

### Variation & överraskning
- **[Quick] Gömda fynd under leran.** Ibland en fläck som döljer ett hjärta/⭐/en fästing-
  emoji som flyger bort med ett komiskt "ploink" — en liten upptäckt per djur.
- **[Quick] Variera badtillbehör per djur** (gummianka för valpen, borste för ponnyn) som
  pyntar karet och ger igenkänning.

### Juice
- **[Quick] Skvalpande vatten + stigande tvålbubblor** i karet; ånga som virvlar. Fyller den
  inerta kulissen billigt.
- **[Quick] "Renare"-ton som stiger** med mätaren (varje borttagen klump ett snäpp ljusare) +
  en mjuk gnugg-textur medan svampen dras.
- **[Quick] Rinnande skum.** Låt skum-fläckar glida nedåt en aning innan de sköljs, och vatten
  pärla av den rena pälsen — mer "riktigt bad".

### Progression
- **[Medium] Synlig "innan/efter".** En liten miniatyr-ikon (lerig → ren) bredvid mätaren som
  fylls upp, så framsteget blir en bild barnet förstår utan att läsa stapeln.

### Karaktär & berättelse
- ~~**[Deep] Djur-specifik finish.**~~ ✅ 2026-08-07 (verifierad i kod). Djuret skakar av sig
  vattnet (`shake`), en ring vattendroppar sprutar och **djuret gör sitt eget läte** via
  `audio.sample('djur_' + type.sample)` — `index.js:905-912`. *Kvar som [Quick]:* rosett/krona
  och att djuret beundrar sig i vattenytan; `bigCelebration` ligger dessutom kvar OVANPÅ den
  djur-specifika finishen i stället för att ersättas.
- **[Quick] Ansiktet alltid synligt.** Håll en lerfri ruta runt ögonen så minen syns under hela
  tvätten (den döljs ofta helt idag), så barnet ser djuret reagera.

### Ljud
- **[Quick] Riktiga klipp** ([[real-audio-sfx]]): mjukt gnugg/skrubb, rinnande dusch, skak +
  vattenstänk. Djur-samples (hast/gris/hund) finns redan — spela ett gladare läte även vid
  upplåsning av duschen, inte bara vinst.
- **[Quick] Lugn bad-ambient** (vatten, fågel) + varierat vinst-sting.

## 5. Status / loggar

- 2026-06-30: Doc skriven (ersätter den gamla bygg-specen; granskad mot koden + playtest som
  visar tät lera över hela djuret och dold min). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] djuret reagerar på beröring + [Quick] ansiktet
  alltid synligt + skvalpande kar/bubblor** — gör tvättobjektet till en varelse och scenen levande.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Tvättobjektet är nu en varelse och
  karet lever:
  - **Djuret reagerar på beröring** (`_reactFace`): njutande liten puls i minen under svampen,
    ögonblink (lodrät hopklämning) vid sköljning, och ett kittlat hopp + "Hihi!/Kittlas!/Hehe!"
    (`floatText`) när man gnuggar samma ställe. Allt via {}-proxy kopierat bara om minen lever +
    spårat i `this._tweens` (dödas i `_clearRound`/`destroy`) → exit-säkert.
  - **Ansiktet alltid synligt**: `_genMud` hoppar över lerklumpar inom `FACE_R` (82px) runt
    ansiktets mitt, så minen syns under hela tvätten (döldes tidigare helt av lera).
  - **Skvalpande kar + stigande tvålbubblor**: nytt `this._tubFx`-Graphics (framför djuret, under
    verktygen) ritas om i `_update` — mjukt vattenskimmer vid vattenlinjen + bubblor som stiger,
    wobblar i sidled, tonar in nära ytan och poppar med en liten puff. Ren data-integrator (inga
    per-objekt-tweens) → exit-säkert.
  - Kvar till nästa omgång: svampens materialitet (samla lera/skölj ren), djur-specifik finish,
    riktiga skrubb-/dusch-klipp, synlig innan/efter-miniatyr.
- 2026-08-04: **P0 ASSETS — djuret är inte längre en form med en klistermärkes-min.**
  Ansiktet ritas nu per art (`makeFace`): ponnyn med öron, mule, näsborrar och man, grisen med
  tryne och spetsöron, valpen med hängöron och nosparti — alla med egna ögon, glansprickar och
  kinder i stället för en 🐴/🐷/🐶-emoji. Även **svampen** (porer + skumkant), **duschen**
  (blått munstycke med strålar och slang) och **tvålen** i mätaren ritas i stället för
  🧽/🚿/🧼. errorCount 0.
- 2026-08-07: **Doc-avstämning mot koden (ingen kodändring).** [Deep] "Djur-specifik finish"
  verifierad som byggd och struken — skak + droppring + djurets eget läte via
  `audio.sample('djur_' + type.sample)` (`index.js:905-912`). **Kvar och äkta öppen:** [Deep]
  "Smutsiga zoner med olika behov" — koden kräver i dag båda verktygen *globalt*
  (`renhet = 0.6·skrubbat + 0.4·sköljt`, filhuvudet `:3-8`), men leran är enhetlig: ingen zon
  kräver skölj-först-sen-skrubba. Valet är alltså "gör båda", inte "läs fläcken". 🔧 kvarstår.
- 2026-08-07 ✅ **Poleringsomgång: kladdlera gör verktygsvalet äkta.** Spelets sista äkta
  [Deep]-punkt. Förut krävdes båda verktygen *globalt* (`renhet = 0,6·skrubbat + 0,4·sköljt`)
  men aldrig ett val om VILKET verktyg som skulle användas VAR — det var samma svep två gånger.
  - **Kladdlera** (`kind: 'klibb'`): svampen biter inte. Klumpen guppar segt, en egen låg
    seg ton (inte samma `soft` som en lyckad skrubb — örat ska höra skillnad utan att titta),
    och ett tips på sin höjd var 2,6 s. Ingen summer, inget kryss, **mätaren går aldrig bakåt**.
    Duschen mjukar upp den till vanlig lera, och då biter svampen.
  - **Zoner, inte prickar.** Första versionen slumpade kladd i.i.d. per ruta — `spelkritiker`
    påpekade att det läste "prickigt" snarare än "ett annat material HÄR", och då är det inget
    verkligt val. Nu 1–3 zoner per djur (`_genZones`), aldrig över ansiktet.
  - **Färgen är vald mot en krock:** `DARKMUD` betyder redan "dubbelt lager, skrubba två
    gånger". Mörkbrun kladd hade alltså burit två olika regler i nästan samma färg — därför
    kall skifferblå med blank dager. Syns tydligt i `.test-shots/_tvatt-kladd.png`.
  - **Blockerare från `spelkritiker`, åtgärdad:** `_idleCue` valde närmaste fläck oavsett sort
    och sa alltid "dra svampen". På en bana med upp till 40 % kladd kunde spelets **egen hjälp
    säga fel handling** i precis det ögonblick barnet pausat. Den filtrerar nu på torr lera,
    och pekar på duschen när bara kladd är kvar.
  - **P0 MOTGÅNG hålls:** tak på andelen, nivå 0 kladdfri, duschen olåst direkt när kladd finns
    (annars vore fläckarna olösbara), och `_autoHelp` mjukar upp en fläck OCH tar bort en annan
    torr i samma tick — så sekvensen syns som två handlingar och något försvinner ändå varje
    tick, även för ett barn som pausar.
  - **Mätt:** `scripts/_tvattprobe.mjs` **8/8** (nivå 0 kladdfri · nivå 4 = 31 % kladd, under
    taket · duschen klar direkt · skrubb på kladd ändrar varken antal eller mätare · dusch
    mjukar 39→15 · svampen biter efter · auto-hjälpen fastnar inte · 0 konsolfel vid exit) ·
    `npm run check` 0/0 · `npm run test:all` **71/71**. Kvar i loggen: samma pre-existerande
    `tryck-utan-ljud`-varning som före omgången (varning, inte fel).
  - `spelkritiker`: inga blockerare kvar. **Kvalitet 🔧 → ✅.**
  - Kvar som [Quick]/[Medium] i §4: svampen borde bli smutsig, gömda fynd under leran,
    före/efter-miniatyr, rinnande skum, riktiga SFX-klipp (väntar på MOSS).
