# Blixt och Dunder (`blixt-och-dunder`)
> 🔤 larande · mixed · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En varm skymningshimmel över en mysig by med hus och **släckta lampor** (grå 💡 ovanför taken;
var tredje varieras till 🏮/🌳). Uppe i ett himmelsband driver fluffiga vita åskmoln. Maskoten
Bobo sitter nere till vänster, och en **mätare** högst upp visar en grå 💡 per lampa. Jag drar
ett moln fritt med fingret och **trycker/gnider** det tills det laddas blått (3 tryck = fullt,
⚡ tonar in, en mjuk puls). När TVÅ fulladdade moln glider ihop och nuddar varandra ritas en
**jagged, flimrande blixt** ner till närmaste otända lampa: `whoosh`+`pop`, en mjuk
helskärms-ljuspuls (aldrig stroboskop), lätt skak, lampan tänds med gyllene glöd, en
mätar-ikon blir vit, rösten säger "Blixten tände lampan!". Båda molnen laddar ur (litet regn)
→ tomma igen. Oladdat tryck → bara mjukt regn (rolig "miss"). Idle ~6s → röst-recue + Bobo
vinkar. Efter ~7s utan ny tändning glider Bobos auto-hjälp ihop två moln garanterat. Alla
lampor tända → regnbåge tonar in + "Hela byn lyser nu!" + firande, sedan byggs en större by
(fler lampor/moln, jitter på nivå 6+).

**Funkar bra:** två *äkta* kontroller (placering + laddning) som båda ändrar utfallet —
ovanligt rikt för åldern. Blixten som alltid böjer sig mot närmaste otända lampa är en smart
no-fail-design. Den flimrande jagged blixten + ljuspulsen + dundret är riktigt saftiga och
ändå snälla. Exit-säkra partiklar (regn/flash/regnbåge via `{}`-proxy). Bobo + mätare + by ger
mer karaktär än de flesta lära-spel.

*(Skärmdump: skymningshimmel, två hus med grå lampor, Bobo nere till vänster, mätare med 2
grå 💡 högst upp.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: väder-magi (3–5 år), två kontroller — PLACERING (dra moln) + LADDNING (tryck/gnid)
— mot målet "tänd alla byns lampor". Allt programmatiskt (Pixi Graphics + emoji + scene.js),
ingen matter.js. Det pedagogiska greppet är **orsak→verkan + sekvensering**: ladda (3 steg) →
para ihop → blixt → ljus, en liten kedja barnet styr. No-fail byggs av tre lager: oladdat
tryck = roligt regn, blixten siktar alltid rätt, och Bobos auto-hjälp garanterar framsteg.
Mätaren gör målet synligt och räknebart (n lampor att tända). "Blixt och dunder" avdramatiseras
medvetet till något vänligt och magiskt.

> **Notera (uppgiftens beskrivning ≠ koden):** uppdraget beskrev spelet som "räkna sekunder
> mellan blixt och åska". Den *byggda* koden gör inget sådant — ingen nedräkning mellan blixt
> och dunder, ingen sekund-räkning. Recensionen gäller koden som den är (ladda-para-tänd). Om
> sekund-räkning önskas är det en **[Deep]**-funktion, se nedan.

## 3. Vad gör det lättjefullt / tunt

Ovanligt rik kärna för ett lära-spel, men flera tunna/lata drag:

- **Interaktiva moln ≠ bakgrundsmoln — men ser likadana ut.** I skärmdumpen är de vita
  ladd-molnen visuellt omöjliga att skilja från scenens dekorativa vita moln. Ett barn vet
  inte *vilka* moln det ska röra förrän de råkar trycka rätt. Ladd-molnen behöver en tydlig
  egen look (mörkare/blådaskig åskmolnsstil, en liten "tryck mig"-markör).
- **Var är räknandet?** Detta ligger under fliken **Lära**, men det enda "talet" är "3 tryck
  = fullt" och en mätare som fylls — ingen siffra sägs, inget räknas högt, ingen
  antalsuppfattning. Som *pedagogiskt* spel är det egentligen ett orsak-verkan-spel, inte ett
  räkne-/bokstavsspel. Laddningssteg-räkning ("ett… två… tre — fullt!") är en självklar miss.
- **Auto-hjälpen tar lätt över.** 7s är kort: en 3-åring som tänker hinner se Bobo glida ihop
  molnen och tända åt hen. Då försvinner agensen i just det moment spelet är byggt kring.
- **Laddnings-feedbacken är subtil.** En blå glöd-alpha som växer — lätt att missa att "något
  laddas". Inga synliga steg (1/2/3-prickar), ingen ton som stiger per tryck. Barnet ser inte
  hur nära "fullt" det är.
- **Lampan är bara av/på.** Tänd = vit tint + glöd. Ingen uppvaknande by (inga fönster som
  tänds, ingen figur som vaknar, ingen rök ur skorstenen). Husen är statiska kulisser.
- **Dundret är ett `whoosh`+`pop`.** Inget riktigt mullrande åskklipp, ingen distans-känsla,
  ingen variation. För ett spel som heter "Dunder" bär ljudet temat svagt.
- **Mätaren är passiv.** Den fylls men firar inte delsteg, räknas inte högt ("två lampor
  lyser!" sägs ibland men kopplas inte till mätaren visuellt).

Kort sagt: mekaniskt ambitiöst och snyggt, men **ladd-molnen är osynliga som mål, "lärandet"
räknar ingenting, auto-hjälpen kortsluter agensen och byn vaknar aldrig till liv.**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Gör ladd-molnen omisskännliga.** Ge dem en distinkt åskmolnsstil (mörkare grå/
  blådaskig kropp, plufsigare, ev. en svag "tryck"-puls vid start) så de aldrig förväxlas med
  scenens dekorativa moln. Detta är den enskilt viktigaste läsbarhets-fixen.
- **[Medium] Skjut upp och mjuka upp auto-hjälpen.** Höj HELP_DELAY till ~12s och låt Bobo
  först *peka* på två moln och vänta — kicka bara in glid-ihop om barnet fortfarande inte
  agerar. Skicklighet (sikta + ladda) ska kännas, aldrig tas över för tidigt.
- **[Medium] Synliga laddningssteg + röst-räkning.** Visa tre prickar/ringar på molnet som
  fylls per tryck och låt rösten räkna "ett… två… tre — fullt!". Nu *räknar* spelet (hör
  hemma i Lära) och barnet ser hur nära fullt det är.

### Variation & överraskning
- **[Quick] Mätar-räkning.** Säg antalet vid varje tändning ("En lampa! …Två lampor!") och
  poppa rätt mätar-ikon synkront — knyt ljud, siffra och bild ihop.
- **[Medium] Olika molntyper.** Ett "regnmoln" (vattnar en blomma som växer), ett snabbt litet
  moln, ett tungt långsamt — rotera per by så nivåerna känns olika, inte bara fler lampor.

### Juice
- **[Quick] Riktigt åskljud.** Lägg ett mjukt, varmt mullrande dunder-klipp ([[real-audio-sfx]])
  med lätt variation i stället för `whoosh`+`pop` — temats bärande ljud. Ett litet "fräs" när
  ett moln blir fullt.
- **[Quick] Byn vaknar.** Vid tändning: tänd husets fönster (gul fyrkant), låt en liten rök
  börja stiga ur skorstenen, ev. ett 😴→🙂 i fönstret. Lampan blir då en *händelse*, inte en
  tint.

### Progression
- **[Quick] Knyt regnbågen till räkningen.** Låt regnbågens bågar tändas en per lampa under
  spelets gång (inte bara på slutet) så barnet ser samlingen växa mot helheten.
- **[Medium] En sovande by → en vaken by.** Bygg progressionen som en berättelse: först
  becksvart by, varje blixt tänder ett liv, sista lampan = hela byn lyser, fåglar/röksignaler
  — en tydlig "vi väckte byn"-båge i stället för "fler lampor nästa runda".

### Karaktär & berättelse
- **[Medium] Bobo som väderkapten.** Ge Bobo tydligare reaktioner: han duckar lekfullt vid
  blixten, jublar vid varje tänd lampa, dirigerar molnen vid idle. Han är redan där — låt
  honom *leva* i scenen, inte bara dyka upp vid hjälp/recue.

### Lärande (om sekund-räkning önskas)
- **[Deep] Blixt-och-dunder-räkning (matchar uppgiftens ursprungstanke).** Efter blixten:
  visa/säg en räkning ("ett… två…") tills dundret hörs — leken att räkna sekunder mellan ljus
  och ljud (avstånd till ovädret). Ren, åldersanpassad fysik-pedagogik som faktiskt gör spelet
  till ett *räknespel* och rättfärdigar Lära-fliken. Helt no-fail (ingen rätt/fel-tid).

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + headless playtest (errorCount 0; skärmdump
  verifierad: skymningsby, 2 grå lampor, Bobo, mätare). Ersatte gammal build-spec med
  granskningsdoc. Noterat: byggd kod gör ladda-para-tänd, INTE sekund-räkning som uppgiftens
  beskrivning antydde — sekund-räkning föreslagen som [Deep].
- Rekommenderad första-omgång: **[Quick] distinkta åskmoln (läsbarhet) + [Medium] synliga
  laddningssteg med röst-räkning + [Quick] riktigt åskljud** — fixar den enskilt största
  läsbarhets-bristen, gör det till ett verkligt räknespel och bär temat i ljudet.
- 2026-07-02: **Första-omgång IMPLEMENTERAD** (errorCount 0, drag + tap headless-testat).
  (1) **Distinkta åskmoln:** ny `makeThunderCloudBody` — mörkare grå-blå & plufsigare kropp
  med skuggad undersida (ersatte den vita `makeCloudBody`, nu borttagen). Nu omöjliga att
  förväxla med scenens dekorativa vita moln. (2) **Synliga laddningssteg + röst-räkning:** tre
  vita ring-prickar per moln som fylls (gul) per tryck/gnid; rösten räknar "Ett / Två / Tre —
  fullt!"; stigande laddningston per steg; mjuk "tryck mig"-puls på prickarna tills första
  laddningen. (3) **Riktigt åskljud:** `_thunderRumble` — lagrade låga toner med slump-variation
  (ersatte whoosh+pop); "fräs" (stigande fizz-ton) när ett moln blir fullt. (4) **Mätar-räkning:**
  varje tänd lampa säger antalet högt ("En lampa! …Två lampor!"). Auto-hjälpen fyller prickarna
  visuellt (tyst) via `_setPipsFull`; urladdning nollställer via `_resetPips`. Allt exit-säkert
  (hint-tween + pip-scale-tweens dödas i `_teardownCloud`).
