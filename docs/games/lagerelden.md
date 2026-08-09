# Lägerelden (`lagerelden`)
> 🎉 roligt · mixed · 2–4 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

Skymning över en lila mark. En ring av stenar omger ett litet bål; en strimma orange-gula
gnistor flammar upp ur glöden. Nere till vänster ligger tre vedpinnar (🪵), nere till höger en
brun bälg med en 💨-pip mot elden, och längst till höger står **Zacke** och håller ut en pinne
med en vit marshmallow framför sig. Uppe i mitten svävar ett litet brunt **fat** med tomma,
streckade platser — dagens order (rosta så många marshmallows gyllene).

Jag kan göra tre saker, och de samverkar: **dra ved** till bålet (elden hoppar till, en 🪵 läggs
på högen, värmen stiger), **trycka/svepa bälgen** (en pust → svall av extra gnistor, en "whoosh",
lågan flammar upp) och **dra marshmallowen** in mot lågans heta zon och hålla den där. När den
hålls nära elden glider färgen mjukt vit → gyllene, gnistor pyr, en röst säger "Snart är den
klar!". Vid gyllene flyger den upp till en plats på fatet med ett "pling"; när hela ordern är
fylld kommer konfetti + beröm + stjärna + klistermärke, och en ny (mörkare, blåsigare) eld med ny
order byggs upp. På högre nivåer **vajar lågan i sidled i en vind** så jag måste hålla
marshmallowen där elden *är* just nu.

**Funkar bra:** den ticker-drivna eld-partikelmotorn är levande och vacker, no-fail är vattentätt
(elden dör aldrig, marshmallowen blir aldrig svart, `_toast` sjunker aldrig, garanterad
värme-boost efter 25s), tre kontroller som *faktiskt* påverkar utfallet uppfyller agens-kravet med
marginal, och order-fatet ger ett synligt mål. Exit-säkert. En genomtänkt, nyligen uppgraderad MVP.

*(Skärmdump: skymningseld i stenring, Zacke håller marshmallow till höger, tomt orderfat uppe.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodkommentaren) var ett mysigt mixed-spel där **mer = bättre, aldrig fara**: mer ved och
mer luft ger bara en *större, gladare* eld och *snabbare* gyllene-rostning — ingen brännskada,
inget game-over. Designmålet var fysik-doktrinen "ett mål + minst två kontroller som ändrar
utfallet" utan en enda bestraffning: ved (`_fuel`), luft (`_air`) och marshmallowens läge styr
rost-takten, och en svajande vind lägger till mjukt sikte på högre nivåer. Order-fatet såddes in
för att ge loopen ett *mål* (rosta N stycken) istället för en oändlig enskild marshmallow. Allt
ritas programmatiskt; den heta partikel-integratorn hålls medvetet utanför GSAP för exit-säkerhet.

## 3. Vad gör det lättjefullt / tunt

Stark grund, men en kräsen förälder ser de billiga dragen:

- **Ingen äter marshmallowen — fatet är ett abstrakt spöke.** Den gyllene marshmallowen flyger upp
  till tomma streck-konturer som svävar i himlen. Det finns ingen *mottagare*: ingen hungrig kompis
  som väntar, tittar, tuggar och säger "mums". Hela poängen med att rosta — att ge någon något gott
  — saknar adressat. Belöningen blir "fyll abstrakta platser", inte "mata en vän".
- **Zacke är en staty.** Han håller pinnen men reagerar aldrig: blickar inte mot marshmallowen, ler
  inte bredare när den blir gyllene, äter den aldrig, vinglar inte när elden flammar upp. Den enda
  mänskliga figuren i scenen är ett bakgrundsobjekt.
- **Veden är nästan kosmetisk.** Värmen är `BASE_HEAT + _fuel*0.12 + _air*0.5 + _boost` — luften
  väger fyra gånger tyngre än veden, och `_fuel` startar redan på 0.6 av max. Att dra på ved känns
  därför knappt i rost-takten; "mer ved = stor eld" är mest ett löfte. Vedhögen växer visuellt men
  betyder lite mekaniskt.
- **Den heta zonen är osynlig.** Det rätta stället att hålla marshmallowen är en *mycket* blek gul
  oval (`_hotMark`, alpha 0.08–0.26) som dessutom vandrar med vinden. En 2-åring ser inte vart hen
  ska sikta; spelet räddas av att marshmallowen auto-fastnar när man släpper nära. Siktet är dolt.
- **Bara en sorts mat, bara en i taget.** Det är alltid en naken vit marshmallow — ingen variation
  (korv, majs, äpple), ingen s'more-montering (kex + choklad), inget att *välja*. Varje plats på
  fatet rostas exakt likadant.
- **Lågan är liten och rostningen flat.** Vid basnivå är elden ynklig (se skärmdump) — den känns
  inte som ett *lägerbål* förrän man pumpat länge. Marshmallowen byter bara färg via en rak
  `lerpColor` — den sväller inte, bubblar inte, får ingen knaprig yta, droppar inte.
- **Tunt ljud.** `soft`/`whoosh`/`reveal` + röst. Ingen sprakande eld-ambient, inget *fräs* när
  marshmallowen rostas, ingen stigande ton när den närmar sig gyllene. Elden är tyst.

Kort sagt: mekaniken är rik och rättvis, men **världen är obefolkad och maten är ensam** — man
rostar åt ett spöke, och den mest påverkande kontrollen (veden) känns minst.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Ge marshmallowen en mottagare.** Sätt en hungrig kompis (Bobo, eller Alissa/Elvira)
  bredvid Zacke som *väntar* med öppen mun. Varje gyllene marshmallow flyger till kompisen som
  tuggar, ler och säger "mums" — och fatet blir en liten *önskelista* ("Bobo vill ha 3 gyllene!").
  Då blir målet begripligt utan läsning och rostandet får en känslomässig adressat.
- **[Medium] Gör veden betydelsefull.** Höj vedens vikt i värme-formeln och låt elden *visuellt*
  växa i bredd/höjd per pinne (inte bara fler partiklar). Då blir "lägg på ved" ett kännbart val:
  liten eld = långsam mys-rostning, stockeld = snabb. Fortfarande no-fail (elden dör aldrig).
- **[Deep] S'more-montering som final.** När en marshmallow är gyllene: dra den mellan två kex med
  en chokladbit → ett *s'more* som kompisen äter. Lägger ett extra litet drag-moment och en riktig
  "klart"-artefakt istället för en abstrakt fylld plats.

### Variation & överraskning
- **[Quick] Fler saker att rosta.** Rotera marshmallow / majskolv 🌽 / korv 🌭 / äpple per order.
  Samma rost-modell, men varje order känns ny och man lär sig att olika saker "blir klara" olika.
- **[Quick] Synlig het zon.** Rita en tydlig glödande "rosta här"-ring (pulserande) kring lågans
  topp som följer vinden, så barnet *ser* vart marshmallowen ska — siktet blir lekfullt synligt.

### Juice
- **[Medium] Levande marshmallow.** Låt den svälla en aning, få en lätt bubblande/förkolnad
  yt-textur och en glansig droppe när den blir gyllene — inte bara en färg-lerp. Liten skärm-glöd
  pulserar med värmen.
- **[Quick] Vindpust som syns.** När man svepar bälgen: rita en kort böjd "luftlinje" från pipen in
  i lågan som böjer flammorna i sidled ett ögonblick — pusten får en riktning och en synlig effekt.

### Progression
- **[Quick] Vädret berättar nivån.** Koppla de befintliga temana (sunset → night) tydligare till
  ordern: stjärnhimmel + mer vind = "kvällsorder". Cross-fade bakgrunden mjukt i `_nextFire` i
  stället för hård rebuild så världen känns sammanhängande.

### Karaktär & berättelse
- **[Medium] Zacke reagerar.** Låt hans blick följa marshmallowen, le bredare ju gyllenare den blir,
  och ge en liten glädjestuds när ordern är klar. Billigt (tween på befintlig Graphics) men gör den
  enda figuren levande.
- **[Deep] En liten lägerplats-värld.** Tält i bakgrunden, en sovande kompis, eldflugor i natten —
  små ambient-detaljer som gör att man *vill* sitta kvar vid elden.

### Ljud
- **[Quick] Sprakande eld-ambient + fräs.** En lugn loopande knastereld i bakgrunden (volym skalar
  med värmen) och ett mjukt *fräs* medan marshmallowen rostas. En stigande liten ton när `_toast`
  närmar sig 1 ("snart!") gör gyllene-ögonblicket hörbart.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter källäsning + playtest (errorCount 0, skärmdump granskad). Inga
  kodändringar. Rekommenderad första-omgång: **[Medium] hungrig mottagare-kompis + [Quick] synlig
  het zon + [Quick] eld-ambient** — störst upplevd själ för låg risk, och adresserar den enda
  största bristen (man rostar åt ett spöke).
- 2026-07-01 🔧 **Första-omgången byggd (alla tre + mönster #2):** (1) **Hungrig mottagare [Medium]**
  — `makeMascot`-Bobo väntar vid orderfatet och mumsar (`_boboChomp`: pop + 😋/Mums! + röst) varje
  levererad gyllene marshmallow, och hoppar av glädje vid full order → man rostar åt NÅGON (pattern
  #2). (2) **Synlig het zon [Quick]** — `_hotMark` är nu en tydlig glödande "rosta här"-ring som
  pulsar och följer vinden (alpha 0.5–0.85, inte 0.08). (3) **Eld-ambient [Quick]** — subtil
  sprakande knaster-crackle (täthet ∝ värme) + rostnings-fräs som STIGER i tonhöjd mot gyllene, via
  `audio.tone()`. Städning: oanvänd `e`-param bort ur `_marshDown`. errorCount 0, skärmdump bekräftar
  Bobo + ring.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).** Skärmdumpen avslöjade att
  hela lägerplatsen svävade: `createScene` ger 96px mark (horisont y=624) men bålet stod på
  y=560, alltså ovanför marklinjen. Marken höjdes till 210px (`GROUND_H`) och allt — bål, ved,
  bälg, Zacke — flyttades ner på den.
  - **P0 ASSETS:** de tre dragbara vedpinnarna och varje pinne på högen var `🪵`-emoji. Nu
    ritade (bark, räfflor, ändträ med årsringar) via `drawLogInto`. `💨`-hinten vid bälgen är
    ersatt med tre ritade luftstreck. Inga `Text`-noder kvar i spelet.
  - **Zacke var trasig, inte bara stel:** kroppen låg helt till höger om huvudet (`roundRect`
    från x=−2), och håret adderades FÖRE huvudet så skinncirkeln täckte det → han såg skallig
    och tudelad ut. Nu: ben+skor, centrerad kropp, riktig arm ut till handen där pinnen sitter,
    hår ovanpå huvudet. Och han reagerar — blicken följer maten, leendet växer med rostningen.
  - **Bälgen** ritades om från långsmala träpaddlar (läste som ännu en vedtrave bredvid
    vedhögen) till en rund lädersbälg med pip och handtag.
  - **Orderfatet** är en träbricka med fördjupningar och en blek silhuett av **exakt den mat**
    ordern gäller; Bobo står bredvid och **håller fram** fatet (arm med kontur och tass, ritad
    under huvudet — den första versionen läste som en pratbubbla).
  - **Veden betyder något nu:** `_fuel`-vikten höjd 0.12 → 0.30 (mot luftens 0.45 som pyser ut
    på sekunder), lågan blir **bredare** med veden, och glödbädden växer i bredd. Bålet startar
    med två pinnar redan pålagda — en ensam gnista i en stor stenring läste som trasigt.
  - **Lågan såg ut som konfetti:** partiklarna var små, glesa och tonade mot grått, plus ett
    alfa-hopp från 0.70 till 0.22 vid t=0.75. Nu feta överlappande partiklar, vit-gul → gul →
    orange utan grå svans, och en kontinuerlig fade.
  - **Het zon = sanning:** ringen sitter på exakt den punkt rostningen mäts ifrån
    (`flameTopY + 20`, tidigare +6) och skalar med lågan.
  - **Variation:** ordern roterar mellan fyra ritade saker — marshmallow, korv, majskolv, äpple
    — med egen framrostning (grillränder, förkolnade fläckar, glansig droppe). Egna talade
    rubriker per sort, skrivna som hela literaler så `/rost` kan generera klipp.
  - **Värld:** tält, granar, buskar, grässtrån och eldflugor i natten. `sunset`-temats **lila**
    mark täcks av ett grästäcke med vågig kant.
  - **P0 GESTER-glapp fixat:** marshmallowen hade eget pekargrepp utan **tap-tap-fallback** —
    ett barn som bara tryckte kom ingenstans. Ett tryck utan rörelse skickar nu maten till
    elden, nästa tryck hämtar hem den.
  - **Grind:** `npm run check --game lagerelden` 0 fel · `npm run test` grönt ·
    `_idleprobe 60s` → `idleFramsteg: 0`, `efterSpel: 1` (spelar sig inte självt, går att
    klara med enbart tryck). 11 nya repliker väntar på röstklipp.
- 2026-08-09: **Bobo blev en rigg** (`lib/karaktarer.js`, utrullningens omgång 4).
  `makeMascot(54)` → `makeKaraktar({ r: 54, kropp: false })` i en yttre container — `kropp:
  false` för att han tittar fram över ett moln och håller fatet med en ritad arm; en
  björnkropp hade hängt ner **genom** molnet. Vilomin `hungrig` (gapande mun) — han väntar på
  mat, det är hans roll. `look()` följer marshmallowen över elden hela vägen upp till fatet.
  Levererad bit → `react('nam')` (munnen tuggar) i stället för `pop` på lådan runt honom. Hela
  ordern klar → `setMood('stolt')`, **inte** `react('jubel')`: spelets fyra hopp på 40 px är
  större än riggens 0,5·r = 27 och äger `y`. Ny order → tillbaka till `hungrig`.
  `npm run test` grön, `check` 0/0. Commit `5270a56`.
