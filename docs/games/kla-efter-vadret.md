# Klä efter Vädret (`kla-efter-vadret`)
> 🔤 pedagogiskt · mixed · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Hela skärmen tonas mjukt i väderfärg (varmt gult för sol, dimblått för regn, ljust
för snö). Uppe en stor pulserande vädersymbol (☀️/🌧️/❄️) med glow; vid regn/snö
faller pooled regn-streck eller virvlande snöflingor. I mitten står **Elvira** — en
glad blond tjej byggd av Pixi Graphics med tofsar. Nederst en garderobshylla med
plagg (rena emoji): de passande + distraktorer från andra årstider. Rösten säger "Det
är sol idag. Klä på Elvira så hon blir lagom!". Jag drar (eller tap-tap:ar via
DragController) ett plagg till en kroppszon (huvud/överkropp/fötter). Rätt plagg +
rätt zon → snäpper fast på figuren, hon hoppar, gnistor, rösten säger plaggnamnet
("Solhatten!"). Opassande plagg → mjuk vink ("Brr, då fryser vi!") och snäpper tillbaka.
Alla obligatoriska zoner fyllda → hon hoppar, firande + stjärna + klistermärke, nytt väder.

**Funkar bra:** konceptet är starkt och scenen marknadsmässig — väderomslaget
(bakgrund + symbol + partiklar tonar mjukt), figuren har riktig karaktär (rätt
karaktärsnamn Elvira), snäpp + tap-tap-fallback är förlåtande, distraktorerna är
genuint säsongsbundna (badbyxor/halsduk/paraply) och mismatch-vinkarna är varma och
vädersspecifika. Svårighet växer i antal zoner (1→2→3) och hyll-plagg. Exit-säkert.

*(Skärmdump: Elvira i sol-väder, solhatt på huvudet, t-shirt på väg ner; halsduk + stövel som distraktorer.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som **omsorgs- och resonemangslek**: barnet kopplar väder →
lämpliga kläder (kategorisering + enkel slutledning) genom att klä Elvira "lagom".
Väderomslaget och partiklarna ska göra vädret kännbart, mismatch-repliker ("Oj, då
blir det för varmt!") lär ut *varför* utan att straffa. NO-FAIL: fel plagg snäpper
bara tillbaka med en vänlig vink. Väder cyklas sol→regn→snö de första rundorna (med
offset så ny session inte upprepar), sedan slumpat ≠ förra.

## 3. Vad gör det lättjefullt / tunt

- **Resonemanget är grunt — det är egentligen emoji-till-zon-matchning.** Varje väder
  har exakt *ett* rätt plagg per zon och distraktorerna är uppenbart fel årstid, så barnet
  lär sig mest "hatten sitter på huvudet" snarare än "varför man tar stövlar i regn". Det
  finns ingen riktig valfrihet (flera dugliga plagg) eller gråzon att resonera kring.
- **Ingen payoff som sluter resonemanget.** När Elvira är klädd hoppar hon bara — hon
  **går aldrig ut** i vädret för att visa att hon nu är torr/varm/lagom. Just det (se henne
  glad i regnet *med* stövlar, frysande *utan* jacka i snön) vore beviset på att klädvalet
  betydde något. Belöningen är frånkopplad från lärandet.
- **Vädret är tyst.** Regnet faller och snön virvlar helt ljudlöst; ingen regn-ambient,
  inget vind-sus, inget "brr". Mismatch-vinken "Brr, då fryser vi!" är TTS, inget riktigt ljud.
- **Liten variation i innehåll.** Bara 3 väder, 3 zoner, och 1–2 extra-distraktorer per
  väder. Efter några rundor har barnet sett alla kombinationer; inget halvkallt/blåsigt väder,
  ingen "för varm/för kall"-nyans.
- **Allt ljud är syntetiskt/TTS** ('correct'/'soft' + röst). Inget mjukt tyg-frasande,
  inget snäpp-"klick" när plagget sätter sig.
- **Generisk belöning.** Samma konfetti+stjärna; ingen vädersspecifik finish (sol-stråle,
  regnbåge efter regnet, snögubbe i snön).

Kort sagt: en *fin, varm omsorgs-loop med snygg scen*, men slutledningen är tunn
(en-rätt-per-zon-matchning) och **klädvalets konsekvens visas aldrig** — hon går inte ut.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Lägg till en "gå ut"-payoff.** När alla zoner är fyllda: Elvira tar ett par
  steg ut i vädret och visar att hon är lagom — torr under regnhatten, varm i snön, sval i
  solen — med en glad replik ("Nu blir jag lagom i regnet!"). Sluter resonemangs-loopen och
  gör belöningen *om* lärandet.
- **[Medium] Tillåt flera dugliga val per zon** (t.ex. både keps och regnhatt funkar i regn)
  så barnet faktiskt resonerar i stället för att hitta det enda rätta. Behåll uppenbart fel
  som mjuk vink.

### Variation & överraskning
- **[Medium] Fler väder/nyanser:** blåsigt (behöver något som sitter fast), halvkallt höst
  (jacka men ingen mössa), regnbåge efter regn. Ger nya kombinationer att tänka kring.
- **[Quick] Variera figuren ibland** (Elvira / Zacke / Lova) så omsorgen känns bredare —
  alla är tillåtna karaktärsnamn.

### Juice
- **[Quick] Snäpp-"klick" + tyg-frasande** när ett plagg sätter sig, och en liten studs på
  zonen. Idag är fastsättningen ljudmässigt platt.
- **[Quick] Elvira reagerar på fel:** huttrar till vid för lite kläder, viftar bort för
  varmt — per-plagg-reaktion gör vinken levande i stället för bara wiggle + TTS.

### Progression
- **[Quick] Bygg en liten "garderob" som fylls** över rundor (samlade plagg/väder), något
  att återkomma till — och lås upp roliga extra-plagg (solglasögon, paraply) som bonus.

### Karaktär & berättelse
- **[Deep] En liten berättelse-ram:** Elvira ska "ut och leka" — vädret är dagens utmaning,
  och payoff:en är att hon kommer ut och leker glatt rätt klädd. Ger ett *varför* bakom omsorgen.

### Ljud
- **[Quick] Riktig väder-ambient via SFX-pipelinen** ([[real-audio-sfx]]): mjukt regn,
  vind-sus, fågelkvitter i sol; ett "brr"-huttrande och snäpp-ljud. Gör vädret kännbart i örat.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] "gå ut"-payoff + flera dugliga plagg per zon** och
  **[Quick] snäpp-klick + väder-ambient** — kopplar belöningen till lärandet, störst lyft för minst risk.
- 2026-07-02: Första-omgång IMPLEMENTERAD ✅. (1) **"Gå ut"-payoff**: när alla zoner
  fyllts säger Elvira "Nu går Elvira ut!", tar två små steg-bobbar ut i vädret och visar
  sedan att hon blivit lagom (vädersspecifik replik + svävande bevis-emoji 😎/☂️/⛄ + gnistor
  + glädjehopp) innan nytt väder. (2) **Flera dugliga plagg per zon**: `good`→`valid`-listor
  (sol-huvud solhatt/keps, sol-kropp tröja/klänning, sol-fötter sandaler/skor; regn-kropp
  regnjacka/paraply, regn-fötter gummistövlar/stövlar; snö-fötter vinterstövlar/kängor). En
  slumpad zon per runda får ETT extra dugligt plagg på hyllan → barnet resonerar. Target
  godkänner tills zonen är fylld (ingen dubbelfyllning); uppenbart fel = mjuk vingel som förr.
  (3) **Snäpp-"klick" + tyg-fras** (audio.tone) + **zon-studs** (pop på ringen) vid fastsättning.
  (4) **Lugn väder-ambient** via audio.tone: fågelkvitter (sol), mjuka droppar (regn), vind-sus
  (snö) — låg volym, gles takt. Självtest: errorCount 0.
