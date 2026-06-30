# Vattenvägen (`vattenvagen`)
> 🧩 pussel · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En mjuk, ljusblå vattenscen. Högst upp en kran 🚰 med en liten pip; under den ett rutnät av
genomskinliga rutor; längst ner en mugg med en streckad gul fyll-linje och ett 🌱 ovanpå. Ur
en rörbricka längst ner drar jag grå rörbitar (rak / böj) och släpper dem i rutorna — varje
nedlagt rör kan jag **trycka för att vrida** 90°. Vissa rör ligger redan på plats; jag fyller
luckorna. Ligger en sten 🪨 i vägen trycker jag bort den (med "💪"). När rören bildar en obruten
kedja från kranen till muggen ropar rösten "Nu rinner det!", gnistror löper längs vägen, och
blå droppar börjar rinna genom rören och fylla muggen. När muggen är full → plantan blommar
(🌸/🌻) + firande + stjärna, och nästa, lite större bana byggs. Rinner vattnet fel läcker det
ut i en mjuk pöl vid sista öppna porten — aldrig en bestraffning. Idle ~6s → en gul ruta glöder
vid nästa rätt cell; ~14s → spelet lägger/vrider biten åt mig.

Funkar bra: rör-vrid-mekaniken är begriplig och taktil, vattnet längs polylinjen är fint,
muggen + blomningen är en mjuk och tydlig belöning, och no-fail (läckage i stället för fail)
är elegant. En gedigen liten "Where's My Water" för småttingar.

*(Skärmdump: kran upptill, 4×3-rutnät med ett vertikalt rör, mugg + planta nedtill, tom rörbricka.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): pyssel i Where's My Water-anda men **helt förlåtande** — vattnet ska
till slut hamna rätt oavsett. Pedagogiken är rumslig: barnet ser hur rör-portar måste möta
varandra och vrider tills kedjan sluter sig. Massor av agens lovades: placering + rotation +
lyfta bort sten. Banorna genereras garanterat lösbara (ner i källkolumnen, sidled, ner till
muggen), med förplacerade rör så att bara några luckor är barnets jobb. Elviras törstiga mugg +
blommande planta är den känslomässiga kroken; mjuk auto-hjälp är no-fail-garantin.

## 3. Vad gör det lättjefullt / tunt

- **Den utlovade Elvira finns inte i bilden.** Kodhuvudet och titeln säger "Elviras törstiga
  mugg", men `_buildMug` ritar bara glas + vatten + glans + planta — ingen figur. Den
  känslomässiga mottagaren (hela poängen med "någon blir glad") är frånvarande; muggen står
  ensam. Det är den största tomheten: vi vattnar en anonym mugg, inte en *karaktär*.
- **De förplacerade rören gör det mesta av jobbet.** Banan är en fast L-form (ner, sidled, ner)
  och bara `missing` celler är tomma (2–6 st). Barnet fyller några hål i en redan halvlöst
  ledning — ingen egen ruttdragning, inga grenval, en enda lösning. "Massor av agens" i
  praktiken = lägg 2–6 bitar och vrid dem rätt.
- **Auto-hjälpen löser banan cell för cell.** Glöden vid 6s pekar på exakt rätt ruta, och vid
  14s lägger/vrider `_autoHelp` precis rätt bit. Ett passivt barn får hela ledningen byggd åt
  sig medan det tittar på — agensen rinner bort lika säkert som vattnet.
- **Tunn rör-vokabulär.** `pipeForPorts` använder bara `rak` + `boj`; tratten/T-röret som finns
  i `BASE` ritas aldrig i en lösning. Inga korsningar, inga ventiler, inga grenar — så banorna
  ser likadana ut nivå efter nivå (bara fler celler).
- **Vattnet och dropparna saknar karaktär.** Dropparna är enfärgade cirklar; "läckaget" är en
  diskret `puff` + `soft` som ett barn knappast kopplar till "vattnet fastnade här". Inget
  porlande, inget skvätt, ingen nivå-höjning man hör.
- **Belöningen är nästan generisk.** Blomningen (🌱→🌸) är spel-specifik och fin — men sen tar
  delad `bigCelebration` + stjärna över. Ingen som *dricker*, ingen som tackar.
- **Ljudet är syntetiskt och sparsamt.** `flip`/`pop`/`reveal`/`soft`. Ingen rör-klonk vid
  vridning som låter som metall, ingen rinnande vatten-ambient, inget "glugg-glugg" när muggen
  fylls.

Kort sagt: en korrekt och snäll rör-pusslare vars **utlovade karaktär saknas, vars banor är
en enda förplacerad linje, och vars auto-hjälp gärna spelar klart åt barnet.**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Visa Elvira vid muggen.** Rita Elvira (eller maskoten) bredvid muggen som väntar
  törstig, sträcker sig mot vattnet och *dricker* när muggen fylls. Direkt blir hela spelet
  "hjälp Elvira" i stället för "fyll en mugg". Liten kod, stor mening.
- **[Medium] Fler tomma celler, färre förplacerade.** Låt barnet bygga en större del av vägen
  själv (behåll bara käll-/mugg-bitarna fasta) så pusslet känns som *barnets* ledning.
- **[Medium] Mjuka upp auto-hjälpen.** Behåll glöd-hinten, men låt 14s-hjälpen bara lägga *en*
  bit och sedan vänta igen — och visa tydligt "Jag hjälper lite!" så barnet ser skillnaden
  mellan sitt eget bygge och hjälpen.

### Variation & överraskning
- **[Medium] Inför fler rörtyper på högre nivåer.** Aktivera T-röret/korsningen (finns redan i
  `BASE.tratt`) och låt vägen förgrenas till två muggar/plantor → äkta val, inte en linje.
- **[Quick] Ventil/kran-bit barnet får öppna** som sista steg ("vrid på kranen!") — ett litet
  klimax-moment innan vattnet släpps på.

### Juice
- **[Quick] Rör som fylls synligt.** Låt innerkanalen färgas blå allteftersom vattnet passerar
  (en löpande fyllning), inte bara fristående droppar — då *ser* barnet flödet hitta vägen.
- **[Quick] Mugg-fyllning med liv.** Stigande vattenyta med liten våg + bubblor + ett "glugg"-
  ljud per nivå-höjning; plantan vippar glatt när den får vatten.

### Progression
- **[Quick] Receptbok/karta över klarade ledningar** eller en liten trädgård som får en ny
  blomma per klarad bana — något att återkomma till och se växa.

### Karaktär & berättelse
- **[Deep] En liten vattenvärld.** Kranen får ett ansikte, en fisk simmar i muggen, plantan
  växer steg för steg över flera banor (planta → knopp → blomma → frukt). Ger en anledning att
  spela "en till".

### Ljud
- **[Quick] Riktiga vatten-SFX via MOSS-pipelinen** ([[real-audio-sfx]]): rinnande porl, droppe-
  plopp, mugg-glugg, plus en mjuk vatten-ambient. Rör-vridningen får en taktil klonk.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Speltest grönt (errorCount 0), skärmdump läst.
  Notering: utlovade Elvira renderas inte i nuläget. Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] visa & drickande Elvira + [Quick] synligt rör-flöde +
  [Medium] fler tomma celler** — ger karaktär, tydligt flöde och äkta agens till låg risk.
</content>
