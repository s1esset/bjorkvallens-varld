# Såpbubblor (`sapbubblor`)
> 🎉 roligt · tap · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En mjuk himmelsscen. Skimrande såpbubblor (vit kontur + färgade glans-bågar + högdager) stiger
UPPÅT, vagglar och driver. Jag kan trycka på vilken bubbla som helst → den spricker med ett
"pop", droppar yr och små gnistor flyger (ren glädje, ger ingen poäng — bara kul). Mitt på
skärmen lyser en tjock blå RING (målet). Längst ner i hörnen står två stora FLÄKTAR: vänster
blåser åt höger, höger blåser åt vänster. Jag trycker på en fläkt → den snurrar upp, vindstreck
driver inåt, och en vindkraft accelererar bubblorna i sidled. Bubblorna har riktig MASSA (stora
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
- **[Deep] Riktig sikt-styrning.** Låt fläkten LUTA mot där jag trycker (eller gör en flyttbar
  fläkt jag drar), så jag kan blåsa upp-och-över in i en högt sittande ring. Då blir varje blås
  ett *val* med synlig effekt — och auto-suget kan dras ner till en mild sista-knuff.
- **[Medium] Koppla ihop halvorna.** Låt poppning bidra mjukt: en poppad bubbla släpper en liten
  bubbla eller en gnista som driver mot mätaren, eller laddar "extra blås". Då känns båda
  aktiviteterna som samma spel (fortfarande no-fail).

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
- **[Medium] Ringen blir en karaktär.** En vänlig figurs öppna mun / Bobo som håller en håv, som
  ler när den matas; flyttande ring på högre nivåer ger naturlig variation.

### Karaktär & berättelse
- **[Deep] En maskot blåser bubblorna.** Bobo (eller Elvira) på ena sidan som blåser fram
  bubblorna och jublar vid varje fångad — ger scenen liv och en anledning att bry sig.

### Ljud
- **[Quick] Dedikerade bubbel- + vind-SFX** ersätter TTS-blåset; varierat beröm vid full ring.

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
