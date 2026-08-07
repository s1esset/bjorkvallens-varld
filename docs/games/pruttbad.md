# Pruttbubbelbad (`pruttbad`)
> 🎉 roligt · tap · 2–4 år · status: ✅ marknadsklar (2026-08-07)

> ⚠️ **Nuläget nedan beskriver spelet FÖRE omgången 2026-08-05** (orange boll, kalt badrum,
> emoji-anka). Läs §5 för vad som faktiskt gäller nu.

## 1. Nuläge (sett som spelare)

Ett porslinsbadkar fyllt med ljusblått vatten. "Zacke" sitter i badet och jag **trycker (eller
HÅLLER)** på hans mage → PRRRT! En luftbubbla föds vid tryckpunkten på karbotten, och om jag
håller kvar växer den synligt. När jag släpper stiger bubblan gungande genom vattnet (egen
ticker-integrator: sin-vobbel i sidled, terminalfart uppåt ∝ radie), studsar mot väggarna och
en **gul gummianka** 🦆 jag kan dra runt, och **POPPAR vid ytan** med ett fniss + skumplask +
gnistor. Varje pop ökar **skummet**, som fyller karet uppåt mot en prickad mållinje 🏁. En
stapel-mätare med ⭐ till höger visar hur full jag är. Skummet vid mållinjen → firande,
pruttsvärm, nytt och lite högre mål (oändlig lek).

Jag kan också trycka på **vattnet** (alltid en kul ring + knuff på närliggande bubblor) och
**dra ankan** (tap-tap glider den dit) för att studsa bubblor åt nya håll. No-fail är vattentätt:
tomma tryck finns inte (vatten ger plopp, magen ger alltid en bubbla), skummet växer monotont,
en anti-stuck-vakt poppar äldsta bubblan om skummet inte vuxit på ~4 s, och vid idle pruttar
Zacke själv tills badet fylls.

**Funkar bra:** håll-för-större-bubbla är fin direktmanipulation (ingen dold gest), bubbel-
fysiken är charmig och städningssäker (rena ticker-objekt, inga GSAP på bubblor), och ljud-
strypningen per nyckel (`_sound` med min-intervall) är ett genomtänkt skydd mot distorsion. Två
mållinjer/mätare gör framsteget tydligt utan läsning.

*(Skärmdump: badkar, "Zacke" som en orange boll med ansikte, gummianka, 🏁-mållinje, ⭐-mätare.)*

## 2. Ursprunglig plan & tankeprocess

Fnitter-fysik för de minsta: tryck → PRRRT → en bubbla som *lever* (stiger, vobblar, poppar) =
omedelbar orsak-verkan med kroppshumor som 2–4-åringar älskar. Håll-för-större lägger en
analog kontroll ovanpå tap:et (lite agens utan precision), och ankan ger en andra kontroll som
*kan* ändra bubblornas bana. Allt är no-fail med flera säkerhetsnät (idle-prutt, anti-stuck)
så badet alltid når mållinjen. Bubblorna hålls medvetet som rena ticker-objekt för exit-säkerhet.

## 3. Vad gör det lättjefullt / tunt

Mekaniskt sunt, men karaktären och en av kontrollerna är tunna:

- **"Zacke" är en faceless orange boll.** I bild (se skärmdumpen) är Zacke bara en orange cirkel
  med ögon och ett leende — inget huvud, ingt hår, inga armar, ingen kropp som badar. Den
  namngivna karaktären finns bara *i namnet*; visuellt är det en placeholder-blob. För ett spel
  som heter "Zacke sitter i badet" badar ingen igenkännbar Zacke.
- **Badrummet är kalt.** Karet är en enkel rundad rektangel. Ingen kakel-vägg, ingen kran, inga
  badleksaker utöver ankan, inget ångmoln, ingen tvål. Stora tomma blå ytor runtom.
- **Ankan saknar konsekvens.** Den är en söt leksak, men att flytta den påverkar nästan aldrig
  *om* badet fylls — skummet växer ändå (anti-stuck ser till det). Den lovade "andra kontrollen
  som ändrar utfallet" gör i praktiken ingen skillnad för målet; den är en konsekvenslös studsklots.
- **Bubblorna är likformiga.** Samma ljusblå cirkel med en glansprick. Ingen regnbågs-sheen,
  ingen bubbla-i-bubbla, ingen sällsynt jätte- eller glitterbubbla — varje pop ser likadan ut.
- **Skummet fyller en abstrakt nivå.** Vit klump + en stapel-mätare; tydligt men inte särskilt
  taktilt eller roligt (ingen skummande textur som bubblar, inget barn som försvinner i skummet).
- **Belöningen är generisk.** `bigCelebration` + PRAISE; pruttsvärmen är en fin krydda men det
  finns ingen egen bad-vinst (Zacke som plaskar jubel, skum-skägg, ankan som flyger).
- **Ljudet stiger inte.** `fart`/`plopp`/`pop`/`soft`/`boing` räcker, men det finns ingen
  klättrande tonhöjd när badet närmar sig fullt — inget crescendo mot mållinjen.

Kort sagt: *en charmig liten bubbel-simulator vars huvudperson och ena kontroll är platshållare* —
roligt att trycka, men Zacke och ankan bär ingen tyngd.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ~~**[Medium] Ge ankan (och fler badleksaker) verklig roll.**~~ ✅ 2026-07-01 (studs + bonus-skum)
  och 2026-08-05 (bonusen SYNS: gul puff i ankans färg, gnistor, stigande ton och ankan studsar
  till — kausaliteten "jag styrde bubblan hit, därför blev det mer skum" fanns förut bara i koden).
  Fler leksaker som styr bubblor är fortfarande ogjort.
- ~~**[Quick] Belöna att hålla.**~~ ✅ 2026-07-01. Giant-bubbla med regnbågs-sheen och dubbelt skum.
- **[Kritisk] ✅ 2026-08-05 — spelet spelade sig självt.** `_idleprobe 60` gav **4 klarade nivåer
  utan ett enda tryck**: auto-hjälpen födde en riktig bubbla var 6:e sekund och anti-stuck-vakten
  hällde in skum ur tomma intet var 4:e. Auto-hjälpen är nu en ren *inbjudan* (`_invite`) och
  vakten lossar bara barnets egna fastnade bubblor. Probe efter fixen: `idleFramsteg: 0`.

### Variation & överraskning
- ~~**[Quick] Bubbeltyper.**~~ ✅ 2026-07-01. Glitter- och jättebubbla. Tvillingbubbla är ogjord.
- ~~**[Medium] Gömda fynd i skummet.**~~ ✅ 2026-08-07 — **den här omgången.** En ritad
  badleksak (båt · stjärna · fisk · badboll · krabba, cyklar per nivå) ligger dold 35–80 % av
  vägen upp; när skummet stigit förbi den dyker den upp med gnistor och gungar kvar rundan ut.
  *(Originaltexten:)* **[Medium] Gömda fynd i skummet.** När skummet stiger kan en badleksak/anka/stjärna dyka upp
  ur det att trycka på — något att upptäcka utöver att bara fylla. *(Medvetet sparad 2026-08-05:
  skummet byggdes om helt i den omgången; fyndet blir billigt och säkert att lägga ovanpå nu.)*

### Juice
- ~~**[Quick] Stigande crescendo.**~~ ✅ 2026-07-01. Poppets tonhöjd klättrar 360→880 Hz med fyllnaden.
- ~~**[Quick] Skummande textur.**~~ ✅ 2026-08-05. Skum-ytan är en rad jäsande bubbeltoppar vars
  radier andas, plus mikrobubblor som stiger genom kroppen. Omritning strypt till ~12 fps.

### Progression
- ~~**[Quick] Mjuk tema-variation per nivå.**~~ ✅ 2026-08-07 — **den här omgången.** `BATHS`
  cyklar per nivå: bubbel (blått) → jordgubb (rosa) → blåbär (lila) → citron (gult) → mint
  (grönt). Vatten, vattentoning OCH skum byter färg samtidigt, och rundan säger sitt namn.
  *(Originaltexten:)* **[Quick] Mjuk tema-variation per nivå.** Byt badvattnets färg/skum-doft-tema (jordgubbsbad
  rosa, blåbärsbad lila) vid nytt mål, så rundorna känns olika. *(Kvar 2026-08-05 — kritikern
  påpekar att omgång 2 och 3 ser identiska ut bortsett från en högre mållinje. Detta är den enda
  punkten som håller `variation` och `mjuk progression` från att vara helt gröna, dvs. det som
  står mellan spelet och ✅.)*

### Karaktär & berättelse
- ~~**[Deep] Bygg en riktig Zacke.**~~ ✅ 2026-08-05. Ritad unge: huvud med vått tofsigt hår
  (kalotten följer skallen), öron, hals, kropp med navel, armar som plaskar vid varje prutt, och
  fyra riktiga miner — glad (vila), fniss (pop), wow (jättebubbla), jubel (fullt bad) — plus ett
  skum-skägg som dyker upp vid 78 % fyllnad. Han sitter numera *i* vattnet: kroppen ritas under
  vattentoningen, kar-kanten framför honom.
- ~~**[Quick] Kakel-badrum.**~~ ✅ 2026-08-05. Kakelvägg i förskjutna rader, golv, hylla med
  schampoflaska/tvål/leksaksbåt, handduk på stång och en kran som droppar ner i badet.

### Ljud
- **[Quick] Variera fart/pop-klippen + lugn vatten-ambient** (skvalp + droppande kran) för
  lugn och rikedom; behåll den befintliga ljud-strypningen.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0). Inga kodändringar ännu. (Ersatte den
  äldre bygg-specen i samma fil med review-format enligt mallen.)
- Rekommenderad första-omgång: **[Deep] bygg en riktig Zacke + [Medium] ge ankan roll** —
  åtgärdar de två tydligaste svagheterna (platshållar-karaktär och konsekvenslös kontroll).
- 2026-07-01 🔧 **Första-omgången byggd (scoped):** (1) **Ankan fick en roll [Medium]** — en bubbla
  som studsar på ankan sparkas upp (`vy -= 3`) och märks `duckBoost` → bonus-skum vid pop, så
  ankans placering nu påverkar utfallet. (2) **Bubbeltyper + belöna-håll [Quick]** — en hålld/stor
  bubbla blir en `giant` (regnbågs-sheen, **dubbelt skum**); ~10 % blir `glitter` (poppar till ✨,
  1.5× skum) via `_makeBubbleView(kind)`. (3) **Stigande crescendo [Quick]** — poppet klättrar i
  tonhöjd (`audio.tone`, 360→880 Hz) ju fullare badet är. Städning: oanvänd `ctx`-param bort ur
  `_newRound`. Den fulla Zacke-figuren (Deep) + skum-textur lämnade till senare. errorCount 0.
- 2026-08-05 🔧 **Andra omgången (poleringsrundan, Kö 1 #5).** Commit `feat(pruttbad): …`.

  **Kritisk agens-bugg — spelet spelade sig självt.** `node scripts/_idleprobe.mjs pruttbad 60`
  gav `idleFramsteg: 4`: badet fylldes och firade **fyra gånger på en minut utan ett enda tryck**.
  Två samverkande gratis-skum-kranar: `_autoHelp` födde en riktig bubbla var 6:e sekund, och
  anti-stuck-vakten anropade `_addFoam(R_MIN)` var 4:e sekund när inga bubblor fanns. Fixat:
  `_autoHelp` → `_invite()` som bara *bjuder in* (prutt-ljud, min-byte, armplask, ren FX-puff,
  repeterad röst, pekande hand första gången) och aldrig rör `_spawnBubble`/`_addFoam`; vakten
  kör bara när `_bubbles.length > 0` och poppar då barnets egen äldsta bubbla. Efter fixen:
  `idleFramsteg: 0`, `efterSpel: 1`. **No-fail betyder att inget straffar barnet — inte att
  badet fyller sig självt.**

  **Ritad Zacke [Deep] + kaklat badrum [Quick] + skum-textur [Quick]** enligt §4 ovan.

  **P0 ASSETS — noll emoji-spelobjekt kvar.** `🦆` (som dessutom renderades som en **gräsand** —
  grönt huvud, brun bringa, alltså inte alls den gula badanka spelet lovar), `🏁` och `⭐` är nu
  ritade. `✨`-floatTexten ersatt av `sparkle()`; utropen är rena svenska ord.

  **Tre buggar hittade på vägen:**
  1. *Sjätte läckan igen* — giant-bubblans regnbågsbågar använde `g.arc()` efter en `.stroke()`
     i samma `Graphics` ⇒ ett streck drogs från föregående form in i varje båge. Lokal
     `arcPath()`-hjälpare införd och använd överallt (även i ansiktets bågar).
  2. *Skummet såg fullt ut innan det var klart.* `_goalY` bottnade på 220 medan `_goalFoam`
     fortsatte växa (+18/nivå), så från nivå 3 nådde skummet mållinjen visuellt långt före
     målet. Skummet ritas nu i **andel** av vägen till linjen, och bubbeltopparnas överskjut
     (`CROWN = 20`) dras av så att kronan och mätaren når linjen exakt samtidigt.
  3. *check.mjs var RÖD på master* — `voiceIntro` saknade rad i `scripts/voice-phrases.json` och
     kunde alltså aldrig få ett klipp. Tillagd via `_addphrases`.

  **Efter kritiken:** armarnas kontur byttes från den ljusa `SKIN_DARK` till kroppens `SKIN_OUT`
  (armarna smälte ihop med torson till en blek klump under vattentoningen), och anka-boosten fick
  en egen florish. `check` grön · `test` 0 fel · `idleprobe` 0.

  **Kvar (medvetet):** tema-variation per nivå [Quick] och gömda fynd i skummet [Medium] — båda
  bygger på skummet som byggdes om här. Vatten-ambient [Quick] väntar på att SFX-pipelinen är
  uppe. Spelet står kvar som **🔧** just därför: kritikern bedömer `variation` och
  `mjuk progression` som endast *delvis* uppfyllda så länge rundorna ser identiska ut.
- 2026-08-07 ✅ **Poleringsomgång: rundorna ser inte längre likadana ut.** Spelet hade INGA
  öppna [Deep]-punkter — dess 🔧 var ett **kvalitetsomdöme** från `spelkritiker` (variation och
  mjuk progression endast delvis uppfyllda "så länge rundorna ser identiska ut"). Omgången
  riktade sig rakt mot det omdömet.
  1. **Badsort per runda** (`BATHS`): bubbel → jordgubb → blåbär → citron → mint. Vatten,
     vattentoning och skum byter färg, och `_newRound` säger badets namn — skillnaden syns på
     en halv sekund och hörs även för den som inte tittar.
  2. **Gömt fynd i skummet:** en ritad badleksak (båt/stjärna/fisk/badboll/krabba, cyklar per
     nivå) ligger dold 35–80 % upp. Skummet stiger förbi → gnistor, `reveal`-ton, replik, och
     den gungar kvar rundan ut. Något nytt att upptäcka varje runda.
  - **Skärmdumpen avslöjade en bugg inget test såg:** rosa skum över blått vatten under hela
    firandet. `_level` ökar i samma stund rundan klaras, men karet målas om först 1,5 s senare
    i `_newRound` — och skummet läste nivån *live*. Badsorten ligger nu i `_bathNow`, satt på
    ett enda ställe (`_applyLevel`), så allt byter samtidigt.
  - **Blockerare från `spelkritiker`, åtgärdad:** nästa rundas fynd avslöjade sig självt direkt
    i **3 fall av 4**. `_onComplete` pumpar in en pruttsvärm som driver `_foam.level` långt förbi
    målet (mätt 350–450 mot ett nytt mål på 88), och `_newRound` placerar det nya fyndet innan
    drän-tweenen hunnit tömma skummet — leksaken gungade synligt i ett tomt kar. Fyndet måste nu
    **armeras**: skummet ska först ha setts UNDER det. Det är oberoende av tajmingen mellan
    `_resolving`, tweens och nivåbytet, till skillnad från en ren `_resolving`-spärr.
  - **Min sond missade det helt** — den testade bara via `setLevel` + sidladdning, alltså
    alltid via `init()` där `_foam.level` är 0, aldrig en **levande** vinst → ny runda. Den
    mäter nu övergången; 8/8 tre körningar i rad på precis det fall som föll 3 av 4.
  - Fyndets x-spann hoppar över ett band kring Zacke (annars ritades leksaken ovanpå honom i
    ungefär var femte runda).
  - **Exit-säkerhet:** spelet hade ingen `_tweens`-lista. Fyndets gungning är `repeat: -1` och
    skriver `.y` på vyn — den dödas nu både vid nivåbyte (före vyn rivs) och i `destroy`.
  - **Mätt:** `scripts/_badprobe.mjs` **8/8** ×3 · `npm run check` 0/0 · `npm run test:all`
    **71/71** · 0 fynd i `.test-logs/pruttbad.json`. **Kvalitet 🔧 → ✅.**
  - Kvar som [Quick] i §4: variera pop-klippen + lugn vatten-ambient (väntar på SFX-pipelinen).
