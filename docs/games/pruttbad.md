# Pruttbubbelbad (`pruttbad`)
> 🎉 roligt · tap · 2–4 år · status: 📝 plan klar

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
- **[Medium] Ge ankan (och fler badleksaker) verklig roll.** Låt en bubbla som studsar på ankan
  *bära den uppåt* och pop:a till en extra-stor skum-klick, eller låt nya leksaker (båt, val 🐳)
  som man placerar samla/styra bubblor mot mållinjen. Då blir placeringen ett meningsfullt val.
- **[Quick] Belöna att hålla.** Gör håll-för-större tydligare värt det: en riktigt stor bubbla
  ger en hörbar "wobble-upp", en regnbågs-sheen och dubbelt skum — så barnet upptäcker djupet.

### Variation & överraskning
- **[Quick] Bubbeltyper.** Sällsynt **glitterbubbla** (poppar till stjärnor), **tvillingbubbla**
  (delar sig på vägen upp), **jättebubbla** som lyfter ankan. Rotera per nivå.
- **[Medium] Gömda fynd i skummet.** När skummet stiger kan en badleksak/anka/stjärna dyka upp
  ur det att trycka på — något att upptäcka utöver att bara fylla.

### Juice
- **[Quick] Stigande crescendo.** Klättrande tonhöjd ju närmare mållinjen skummet kommer, och en
  mjuk "blubb"-klang per bubbla istället för bara `pop`.
- **[Quick] Skummande textur.** Låt skum-ytan bubbla/jäsa (små poppande mikrobubblor) istället
  för en statisk vit klump.

### Progression
- **[Quick] Mjuk tema-variation per nivå.** Byt badvattnets färg/skum-doft-tema (jordgubbsbad
  rosa, blåbärsbad lila) vid nytt mål, så rundorna känns olika.

### Karaktär & berättelse
- **[Deep] Bygg en riktig Zacke.** Ge honom huvud, blött tofsigt hår, armar som plaskar, en
  badmössa, och uttryck som byter med leken (fniss vid pop, häpen min vid jättebubbla, skum-
  skägg när badet är fullt). Här bor spelets själ — just nu badar ingen.
- **[Quick] Kakel-badrum.** Lägg en kaklad vägg, en droppande kran (som matar vatten visuellt),
  handduk och en gummiankas-flock så scenen får liv och plats.

### Ljud
- **[Quick] Variera fart/pop-klippen + lugn vatten-ambient** (skvalp + droppande kran) för
  lugn och rikedom; behåll den befintliga ljud-strypningen.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0). Inga kodändringar ännu. (Ersatte den
  äldre bygg-specen i samma fil med review-format enligt mallen.)
- Rekommenderad första-omgång: **[Deep] bygg en riktig Zacke + [Medium] ge ankan roll** —
  åtgärdar de två tydligaste svagheterna (platshållar-karaktär och konsekvenslös kontroll).
