# Såpbubblor (`sapbubblor`)
> 🎉 roligt · tap · 2–5 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

En mjuk himmelsscen. Skimrande såpbubblor (vit kontur + färgade glans-bågar + högdager) stiger
UPPÅT, vagglar och driver. Jag kan trycka på vilken bubbla som helst → den spricker med ett
"pop", droppar yr och små gnistor flyger (ren glädje, ger ingen poäng — bara kul). Mitt på
skärmen lyser en tjock blå RING (målet) — och **Bobo håller den**, gapar och sväljer varje bubbla
han får, hoppar när mätaren blir full. Längst ner i hörnen står två stora FLÄKTAR med munstycken
vars blad alltid idlar. **Jag trycker var som helst i himlen → närmaste fläkt vrider sig mot
punkten och skickar en synlig vindpuff dit**, som färdas längs siktlinjen och knuffar de bubblor
den sveper förbi — i både sid- och höjdled, så jag kan blåsa upp-och-över in i en högt sittande ring. Bubblorna har riktig MASSA (stora
= tunga, små = lätta), luftmotstånd och momentum, så lätta bubblor blåser längre. En förlåtande
"sug" drar bubblor som närmar sig in i ringen. Varje bubbla i ringen fyller en prick i mätaren
uppe; full mätare → firande + stjärna + klistermärke + nästa nivå (ringen flyttar/krymper, fler
prickar, mild bris högre upp).

INGET fel: poppning är bara skoj, fläkten hjälper alltid, och efter 10s utan poäng blir suget
starkare (auto-hjälp) så ringen alltid blir full. Tom-tryck ger glitter. Idle ~6s → om-uppmaning.

**Funkar bra:** bubblorna är vackra och stiger trovärdigt, den riktiga massan/momentum-fysiken
ger en skön tyngdkänsla, fläkt-vindstreck är tydliga, och dubbelnaturen (poppa fritt ELLER styra
mot ett mål) ger både 2-åringen och 4-åringen något. No-fail är osynligt generöst.

*(Skärmdump: himmel, stor blå ring uppe till höger, mätare uppe, två fläktar i nederkanten, bubblor.)*

## 2. Ursprunglig plan & tankeprocess

Kodens header: behåll det härliga (glittrande bubblor man bara petar sönder) men gör det till
ett RIKTIGT spel med ett mål — styr bubblorna in i en ring med fläktar. Tanken var att lägga
ett lager av agens och fysik (massa, drag, impuls) ovanpå en bevisad orsak-verkan-leksak, helt
no-fail: poppning straffar aldrig progress, fläkten hjälper alltid, auto-sug garanterar att
ringen fylls. Nivåerna växer lugnt (ringen flyttar/krymper, ambient bris högre upp).

## 3. Vad gör det lättjefullt / tunt

> **Historik:** kritiken nedan skrevs 2026-06-30 och gäller läget FÖRE omgången 2026-08-05.
> Punkterna om fastnitade hörnfläktar, auto-sug som spelar nivån åt en, livlös ring och tom
> himmel är åtgärdade — se §4 och §5. Kvar: bubblornas likformighet är bara delvis löst.

Två fina halvor, men styrningen och kopplingen mellan dem är tunnare än de verkar:

- **Fläktarna är fastnitade hörn-pushare.** De sitter låsta nere i hörnen och blåser BARA
  horisontellt (vänster→höger, höger→vänster). Jag kan inte flytta dem, inte rikta uppåt, inte
  fininställa. Styrningen blir grov: spamma en fläkt och hoppas att bubblan driver sidledes och
  *råkar* stiga upp genom ringen. Det känns ungefärligt, inte precist.
- **Auto-suget + auto-hjälpen spelar nivån åt mig.** Den breda "sug"-banden (`hoopR * 1.9`) plus
  helpBoost fångar bubblor generöst; ofta fylls ringen mest av sig själv. Fläkten känns mer
  dekorativ än avgörande — min input påverkar mindre än den ser ut att göra.
- **De två halvorna förstärker inte varandra.** Att poppa en bubbla ger NOLL mot målet (medvetet),
  så ett barn som bara älskar att poppa gör aldrig framsteg, och ett barn som styr mot ringen har
  ingen anledning att poppa. Leksaken och spelet lever sida vid sida utan att mötas.
- **Bubblorna är visuellt likformiga.** Samma glans-bågmönster på alla, bara radien varierar. Inga
  specialbubblor (regnbåge, jättebubbla, en med en gömd överraskning inuti, tvillingbubblor) som
  ger ett "wow" eller en anledning att jaga en särskild bubbla.
- **Ringen och fläktarna är livlösa maskiner.** Ringen är en ritad blå cirkel som poppar lite vid
  poäng — den "sväljer" inte, har ingen karaktär. Fläktbladen snurrar bara vid tryck (en knapp),
  inte som en maskin som idlar.
- **Ingen maskot, tom himmel.** Ingen som blåser bubblorna, ingen som håller ringen, inget i
  scenen utöver moln.
- **Talat + generiskt ljud.** `whoosh`/`pop`/`correct` + TTS "Blås!"/fraser. Inget riktigt
  bubbel-"blubb", ingen fläktvirr, inget mjukt "shloop" när en bubbla fångas.

Kort sagt: **fin fysik men vag agens** — fasta hörnfläktar + brett auto-sug gör styrningen luddig,
och poppa-leksaken och ring-målet pratar aldrig med varandra.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ~~**[Deep] Riktig sikt-styrning.**~~ ✅ 2026-08-05. Fläkten lutar mot tryckpunkten och föder en
  vindpuff längs siktlinjen; auto-suget nedskruvat till en nästan-träff-hjälp.
- ~~**[Medium] Koppla ihop halvorna.**~~ ✅ 2026-08-05. En poppad bubbla släpper en barnbubbla
  som stiger och går att blåsa in i ringen.

### Variation & överraskning
- **[Quick] Specialbubblor:** regnbågsbubbla (firar en bonusprick), trög jättebubbla, en bubbla
  med en gömd emoji som flyter ut när den poppas, tvillingbubblor som poppar ihop. Rotera per nivå.
- **[Quick] Variera glans/ton** så bubblorna ser individuella ut, inte stansade.

### Juice
- **[Quick] Riktiga bubbel-SFX:** mjukt "blubb/plopp" vid pop + fläktvirr medan man blåser; en
  fångst ger ett tillfredsställande "shloop" + en ringkrusning.
- **[Quick] Levande maskiner:** fläktbladen idlar långsamt och snurrar upp vid tryck; ringen gör
  en mjuk "svälj"-squash när en bubbla åker in.

### Progression
- ~~**[Medium] Ringen blir en karaktär.**~~ ✅ 2026-08-05. Bobo håller ringen, gapar och sväljer
  vid varje poäng och hoppar när mätaren är full.
- **[Quick] Motstånd tidigare.** `breezeAmp` är 0 under nivå 3, så de tre första nivåerna har inget
  annat motstånd än siktet självt. Överväg en mycket svag bris redan från nivå 1.

### Karaktär & berättelse
- **[Deep] Någon som BLÅSER fram bubblorna.** Bobo tar numera emot vid ringen; källan är fortfarande
  anonym (bubblor föds ur nederkanten). En figur som blåser dem ur en pipa skulle sluta cirkeln.

### Ljud
- ~~**[Quick] Dedikerade bubbel- + vind-SFX**~~ ✅ 2026-08-05 som syntes (poppets tonhöjd följer
  bubbelns storlek). Riktiga MOSS-klipp för `blubb`/`flakt` väntar fortfarande på att tjänsten är uppe.

## 5. Status / loggar

- 2026-06-30: Doc skriven. Speltestad (errorCount 0, skärmdump granskad — ring + fläktar + mätare).
  Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Deep] lutande/flyttbar fläkt (dämpa auto-suget) + [Quick]
  specialbubblor + bubbel-SFX** — ger styrningen verklig agens och scenen liv.
- 2026-07-01 🔧 **Första-omgången byggd (scoped):** (1) **Dämpat auto-sug [Medium]** — sug-bandet
  smalnat (hoopR·1.9→1.2), auto-hjälpen senare + mildare (10→14 s, boost 2.2→1.6) så fläktens
  styrning avgör mer. (2) **Specialbubblor [Quick]** — `_spawn` ger ibland regnbågsbubbla (extra
  fest vid pop), överraskningsbubbla (gömd emoji flyter ut) och trög jättebubbla. (3) **Bubbel-SFX
  [Quick]** — synt "blubb" vid pop, fläkt-virr vid blås, "shloop" vid infångning via `audio.tone()`,
  med `sample('blubb'/'flakt')`-hookar för MOSS ([[real-audio-sfx]], #3). Städning: oanvänd
  `ctx`-param bort ur `_buildHoop`. Den fulla flyttbara fläkten (Deep) lämnad till senare.
  errorCount 0.
- 2026-08-05 ✅ **Andra omgången — styrningen fick agens och scenen en mottagare.**
  1. **Riktat blås [Deep].** Tryck var som helst i himlen vrider närmaste fläkt mot punkten och
     föder en **vindpuff** som färdas längs siktlinjen, breddas och tonar ut (`_addGust`). Puffen
     ger kraft i BÅDA axlarna delat med bubblans massa, så man kan blåsa upp-och-över in i en högt
     sittande ring, och en jättebubbla knappt rör sig. Fläkthuvudet har ett munstycke som roterar
     mot siktet, bladen idlar alltid och snurrar upp vid blås. Tak: `MAX_GUSTS` 5.
  2. **Bobo håller ringen [Medium].** Ritad maskot med grepp om ringbandet, andning i vila, gapande
     mun som sväljer vid poäng och hopp vid full mätare. Byter sida när ringen flyttar.
  3. **Poppa föder målet [Medium].** En poppad bubbla släpper en barnbubbla som stiger.
  4. **Noll emoji-spelobjekt (P0 ASSETS).** 💨 → ritade chevroner, 🛟 → ritad miniring i mätaren,
     ⭐ → ritad stjärna, och de 8 överraskningarna → `overraskningar.js` (fjäril, fisk, blomma, bi,
     jordgubbe, stjärna, regnbåge, fågelunge), med en svag siluett inuti bubblan som lockbete.
     Död, dold `🛟`-Text i `_buildHoop` (skapades, adderades aldrig, städades aldrig) borttagen.
  5. **Buggar hittade i skärmdumpen/mätning:**
     • *Sjätte läckan igen* — glans-bågarna saknade `moveTo` före `arc()` och drog streck tvärs
       över varje bubbla ("krokar" i skärmdumpen). Fixat i `_drawBubble` och i `overraskningar.js`.
     • *Sjunde läckan* — bubblorna försvann mot den ljusa himlen; fick en mörkare ytterkontur.
     • Fläktstativen klipptes av nederkanten (y + 100 = 724 > 720) — flyttade upp.
     • **Spelet spelade sig självt.** Kritikern mätte en hel nivå klar på **10 s utan ett enda
       tryck**. Orsak: var tredje bubbla föddes i ringens lodräta korridor och suget (`PULL_RANGE`
       1.9→1.2 räckte inte) drog in allt som drev förbi. Nu föds ALLA bubblor utanför korridoren
       utom när auto-hjälpen slagit på, och `PULL_RANGE` är 1.15 (infångning sker vid 0.8).
       Mätt efteråt med `scripts/_idleprobe.mjs`: **20 s utan input = 0 framsteg**, 30 s riktat
       spel = en ring full, och no-fail-ventilen fyller ringen själv först runt 40–50 s.
     • Barnbubblornas träffyta var 80–96 px (P0 kräver ≥96) — golv på `Math.max(48, r + 20)`.
     • Bobos arm låg i ringens container och lossnade från kroppen när han hoppade — flyttad in
       i hans egen container, där handen alltid sitter 96 px från mitten oavsett ringradie.
  Grind: `npm run check --game sapbubblor` grön · `npm run test sapbubblor` errorCount 0.
  Kvar: riktiga MOSS-klipp, en figur som *blåser fram* bubblorna, bris tidigare än nivå 3.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): vindpuffars despawn, bubblors sidostuds (studsade mot ingenting 163 px in i bilden på telefon), topp/botten-despawn och födsel — allt mot `ctx.view`. Testad båda viewports: 0 fel.
