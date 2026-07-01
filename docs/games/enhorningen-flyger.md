# Enhörningen Flyger (`enhorningen-flyger`)
> ⚙️ fysik · drag · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

Elviras enhörning 🦄 glider fram vid en fast x-position (300) över en mjuk blå himmel med sol och
parallax-driftande moln. Jag styr bara **höjden**: drar fingret upp/ner (eller tappar i övre/
nedre halvan) och hon glider mjukt dit med momentum (egen 1D-integrator: fjäder mot fingret +
dämpning — hon snäpper aldrig, hon *glider*). Himlen scrollar mot vänster; färgglada glansiga
ringar och stjärnor ⭐ kommer emot henne. Flyger hon genom en rings öppning tänds en pip i
topp-raden och en ⭐ flyter upp; rör hon en stjärna samlas den. Andra kontrollen: en stor
**"Långsammare"-knapp** (🐢/🐇) nere till vänster som halverar scroll-farten så de minsta hinner
sikta (sparas per profil). Inget fel-läge: banan tar aldrig slut förrän målet nås, en missad ring
studsar lekfullt och köar en ny, och en auto-magnet (starkare efter ett par missar) drar henne
mot ringens mitt så hon alltid kommer igenom. Når hon målantalet ringar → stort firande + nästa
nivå (fler/mindre ringar, böljande ring-bana, fler stjärnor).

**Funkar bra:** glid-känslan är genuint skön (momentum + dämpning ger "flyt", inte hopp), den
mjuka auto-magneten gör sikte förlåtande utan att ta över helt, en glitter-svans följer henne när
hon rör sig, och progress-pipsen + stjärnorna ger två parallella mål. Slow-knappen är en smart
tillgänglighets-spak. Exit-säkert.

*(Skärmdump: enhörnings-huvud till vänster över moln, en orange ring till höger, 🐇 Normal-knapp nere till vänster.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): en **endimensionell flyg-/sikteslek** (à la "flappy" men helt no-fail och
lugn) där barnet bara behärskar höjd och får en härlig glid-känsla. De ≥2 utfalls-ändrande
kontrollerna är höjd-styrningen + slow-toggle; momentum-integratorn gör att skicklighet (släppa i
rätt stund och låta henne glida) belönas medan klumpiga drag ändå funkar. No-fail garanteras av
oändlig bana (missade ringar köar nya) + en auto-magnet som skärps efter missar. Enhörningen är
ett djur (inget namn krävs); ryttaren/ägaren är Elvira (P0).

## 3. Vad gör det lättjefullt / tunt

Skön kärna, men flera tunna drag — och scenen ser tom ut i vila:

- **Glest fält.** På skärmdumpen finns *en* ring och inga stjärnor synliga; ringarna spawnas med
  520px lucka så himlen är mest tom yta. För ett litet barn ser det ut som att inget händer förrän
  nästa ring sakta seglar in. Tätare/varierad rytm vore mer inbjudande.
- **Enhörningen är en statisk emoji.** 🦄 lutar bara lite efter `vy` (`rotation = vy*0.012`) — inga
  vingslag, ingen galopp, ingen man som fladdrar, ingen blick mot nästa ring. Glitter-svansen är
  enda livstecknet.
- **Elvira syns aldrig.** Berättelsen är "Elviras enhörning" men Elvira finns inte i bild — ingen
  ryttare, ingen som väntar i mål, ingen karaktär alls utöver själva djuret.
- **Auto-magneten kan flyga åt en.** `ASSIST_HELP` efter 2 missar + `missStreak >= 2` som dessutom
  *centrerar nya ringar på enhörningens y* → passage blir nästan garanterad oavsett vad barnet
  gör. No-fail rätt, men siktet kan bli innehållslöst.
- **Ringar och stjärnor ser nästan likadana ut som mål.** Båda ger sparkle + uppflytande ⭐ +
  liknande ljud (`pling`/`pop`); det är svårt att känna att de är *olika* sorters belöning.
- **Pip-raden är abstrakt och liten.** Framstegsmålet är små hoops högst upp (y=120) — lätt att
  missa för ett barn som tittar på enhörningen. Ingen tydlig "så här långt kvar"-känsla i världen.
- **Ljudet är generiskt UI.** `tap`/`pling`/`pop`/`reveal`/`soft` + TTS ("Hoppsan!", "Wow!", "Fler
  ringar!"). Ingen vind/sus i farten, ingen "magisk" klang när hon flyger genom en ring, ingen
  galopp-rytm.
- **Belöningen är standard** `bigCelebration` + stjärna; enhörningen gör bara en `pop`.

Kort sagt: **glid-fysiken är förstklassig men världen runt är gles och själlös** — ett vackert
flyt genom nästan tom himmel, utan Elvira och utan att enhörningen lever.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Tätare, mer varierad bana.** Minska luckorna något och blanda in ring-par på olika
  höjd, sicksack-stigar och stjärn-bågar man "skördar" genom att glida i en kurva — gör höjd-valet
  till ett kontinuerligt sikte i stället för enstaka glesa ringar.
- **[Medium] Synligt sikte.** Rita en svag prickad "ideallinje" eller en glöd i nästa rings mitt
  som svarar när enhörningen är på rätt höjd — gör barnets styrning till ett tydligt val (och låt
  auto-magneten skärpas först när barnet verkligen sackar).
- **[Deep] Ringen reagerar på passage.** Låt ringen spricka i en färgvåg / studsa undan / skicka
  ut konfetti i sin egen färg vid genomflygning, i stället för en generisk `pop` — varje ring ett
  litet eget ögonblick.

### Variation & överraskning
- **[Quick] Olika ring-typer:** regnbågsring (extra glitter + pip ×2), blomring, molnring — och
  sällsynta gyllene stjärnor som ger en gnistkaskad.
- **[Quick] Himmel-variation per nivå:** dag → solnedgång → stjärnhimmel → norrsken via
  `createScene`-tema/crossfade, så långa sessioner känns nya.

### Juice
- **[Quick] Enhörningen lever:** lägg vingslag/galopp-bob (liten y-oscillation kopplad till `_t`),
  fladdrande man, och låt huvudet luta *mot nästa ring*. Förstärk svansen vid hög fart.
- **[Quick] Magiskt genomflygnings-ljud** (uppåtgående klang) + ett mjukt vind-sus vars tonhöjd
  följer scroll-farten (lägre när 🐢 slow är på).
- **[Quick] Ring-genomflygning** ger en kort ljus-ring/skärmglimt i ringens färg.

### Progression
- **[Medium] Tydligare mål i världen.** Visa "regnbågsporten" eller Elvira i fjärran till höger
  som närmar sig när pipsen fylls — så barnet ser *vart* resan går, inte bara abstrakta hoops.
- **[Quick] Pip-raden större och mer levande** (fyll med ringens faktiska färg, studs vid varje).

### Karaktär & berättelse
- **[Deep] Elvira med.** Sätt Elvira som ryttare på enhörningen (eller väntande i mål som vinkar
  in henne och kramar vid varje nivåslut) — ger berättelsen ett ansikte och en spelspecifik
  vinst-scen i stället för generisk konfetti.
- **[Quick] Insamlade stjärnor landar i en liten "stjärnpåse"** vid pipsen — något att samla över
  rundor.

### Ljud
- **[Quick] Riktiga SFX från [[real-audio-sfx]]:** galopp, magiskt sus, ring-klang — ersätt
  syntetblippen; ersätt TTS-fraserna med förgenererade klipp.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan, ersätter gammal bygg-spec). Testat headless med drag
  (errorCount 0), skärmdump läst (gles scen noterad). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] tätare/varierad bana + [Quick] levande enhörning
  (vingslag/blick mot ring) + magiskt genomflygnings-ljud** — fyller den glesa himlen och ger
  djuret liv.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Byggde om spawn-kön till en tätare,
  varierad rytm: ringar siktar mot växlande höjder (sicksack via höjd-hint i kön), var tredje ring
  får ett tätt syskon-par på motsatt höjd, och stjärnorna bildar en böjd båge man skördar genom att
  glida i en kurva mellan ringarna (ring-gap 520→380, ring-till-ring ~640 vs 780). Enhörningen
  lever nu: galopp-bob (mjuk y-oscillation på emojin kopplad till `_t`), vingslags-höjdpuls, och
  huvudet lutar mot NÄSTA rings höjd (blick framåt) utöver farten; glitter-svansen förstärks
  (tätare/bredare) vid hög fart. Genomflygning spelar ett magiskt uppåt-glidande skimmer-ljud
  (två `audio.tone`-sinusar som glider uppåt) ovanpå attacken i stället för bara `pling`. Allt
  kosmetiskt hålls borta från kollisions-y; exit-säkert (inga nya råa tweens på Pixi-objekt).
