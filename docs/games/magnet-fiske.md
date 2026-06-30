# Magnetfiske (`magnet-fiske`)
> 🧩 drag · drag · 2–4 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En blå damm sedd ovanifrån. Saker simmar runt långsamt i vattnet: metall (🐟🔑🪙🔩🥫) och
icke-metall (🦆🛟⛵). Jag drar en magnet 🧲 som hänger i ett spö från en fast pivot uppe i
högra hörnet. Metallsaker inom magnetens kraftfält (~300px) sugs *radiellt* mot magneten —
len drift långt bort, snabb snäpp nära — och fastnar i en liten solfjäder-klase under
magnethuvudet (`match`-ljud + gnistra + "Den fastnar! Metall!"). Ankor och badringar bryr
sig inte alls; kommer magneten för nära knuffas ankan bara mjukt undan med ett "Hihi!". Jag
drar de fastklistrade sakerna till hinken 🪣 på stranden (gul glödring = släpp-zon), där de
ploppar ner och en ⭐ tänds i räknar-raden ovanför hinken. Alla metallsaker i hinken →
firande + ny, lite större damm. Tap-tap funkar också: tappa en metallsak och magneten glider
dit; tappa hinken och lasten släpps. Idle ~6s → röst + närmaste metall andas/gnistrar + en
liten knuff mot magneten.

**Funkar bra:** den radiella, kalibrerade attraktionen känns *magisk* (sakerna suger sig fram
genom vattnet), simningen gör målen rörliga och levande (aktivt fiske, inte statiska högar),
metall-vs-icke-metall ger äkta val och ett litet pedagogiskt frö, no-fail är vattentätt (ankor
kan aldrig fastna, fältet når hela dammen, idle-knuff garanterar framgång), räknar-raden visar
målet utan en sjunkande siffra. Mycket exit-säkert (proxy-tweens, all fysik städas). En
genomarbetad, taktil upptäckarlek.

*(Skärmdump: blå damm, spö från övre högra hörnet ner till magneten som fångat 🔑 och 🥫,
en 🦆 guppar undan nedtill, hink med glödring + två bleka ⭐ till höger.)*

## 2. Ursprunglig plan & tankeprocess

En "fysik-/upptäckarlek" (kodkommentar) byggd på matter.js: lär ut att *magneter gillar
metall, inte trä/gummi* — helt utan felsteg. Den nyligen omdesignade kärnan (saker simmar
runt och man jagar dem med magneten) lyfter spelet från "städa en hög" till "fiska rörliga
mål", vilket ger sikte och agens åt även de minsta (2–4). Den radiella 1/avstånd-kraften är
medvetet kalibrerad mot matters fasta 1/60-steg så pullen känns rätt (len på avstånd, snabb
nära). Selektiviteten (bara metall fastnar) är den pedagogiska kroken; ankans mjuka undanknuff
gör "fel" mål till ett skratt i stället för ett straff.

## 3. Vad gör det lättjefullt / tunt

Stark, polerad kärna — men några tunna kanter återstår:

- **Magnet-vs-anka lärs aldrig ut explicit.** Spelet *säger* "Den fastnar! Metall!" men
  ankans icke-fastnande kommenteras bara med "Hihi!". Ett barn förstår kanske att ankan studsar
  undan, men inte *varför* (trä/gummi ≠ metall). Ingen kontrast-förstärkning ("Ankan är av
  trä — den fastnar inte!").
- **Sakerna har ingen egen karaktär.** En 🐟 och en 🔩 beter sig exakt likadant (samma kropp,
  samma simning, samma fastna-pop). Fisken simmar inte som en fisk, myntet glittrar inte,
  burken skramlar inte. Det är sju utbytbara cirklar med olika emoji.
- **Magneten/spöet har ingen hand bakom sig.** Spöet kommer ut ur tomma intet i hörnet — ingen
  figur som fiskar (Bobo/Zacke på en brygga). Ingen vid hinken som tar emot fångsten.
- **Hinken bara räknar.** Sakerna ploppar ner och försvinner; hinken fylls aldrig synligt
  (man ser inte fisken/nyckeln ligga i den), den vippar inte, jublar inte. ⭐-raden är funktionell
  men generisk.
- **Ljudet är UI-blipp.** `tap`/`match`/`pling`/`soft` — inget plask när magneten doppas, inget
  "kläck" av metall mot magnet, inget vattenporlande. Allt utom rösten låter som meny-klick.
- **Belöningen är generisk.** `bigCelebration` + `progress.complete()` som överallt. Inget
  fiske-tema ("Full hink! Vilken fångst!"), ingen scen som reagerar.
- **Variationen är bara "fler saker + snabbare simning".** Emoji-mixen växer lite, men det
  finns inga nya *händelser*: ingen gammal stövel som skämtfångst, ingen skattkista som kräver
  två saker, ingen sällsynt guldfisk. Damm 4 är damm 1 med fler ikoner.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Förstärk metall-lärandet.** När en anka knuffas undan: visa kort *varför* med en
  liten ikon/röst ("Trä! Magneten gillar inte trä." / "Gummi!"). Gör kontrasten tydlig och
  pedagogisk utan att straffa — själva poängen med spelet bör höras, inte bara "Hihi!".
- **[Deep] Sorterings-final.** På högre nivåer: två hinkar (metall vs "kasta tillbaka"-ankor),
  så barnet aktivt *sorterar* fångsten. Lägger ett pussel-lager ovanpå utan fail (fel hink →
  mjuk studs tillbaka).

### Variation & överraskning
- **[Quick] Saker med egen rörelse.** Låt fisken simma i mjuka S-kurvor, myntet snurra långsamt,
  burken guppa stelt — billig per-typ-variation som gör dammen levande.
- **[Medium] Skämt- och skatt-fångster.** En sällsynt gammal stövel 🥾 (skratt-fångst), en
  skinande skattkista 🧰 (extra gnistor/beröm), en "blank" guldfisk som blänker — sällsynta
  wow-ögonblick som bryter monotonin.

### Juice
- **[Quick] Riktiga vatten- & metall-ljud.** Plask när magneten doppas, ett mjukt "klונk/kläck"
  när metall snäpper fast, porlande ambient. Den enskilt största känslo-vinsten (se Ljud).
- **[Quick] Vattenrespons.** En liten krusnings-ring där magneten rör vattnet och där en sak
  fastnar; droppar som rinner av magneten när den lyfts mot hinken.

### Progression
- **[Medium] Synligt fylld hink.** Låt fångade saker faktiskt *synas* hopa sig i hinken (små
  staplade emoji) i stället för att försvinna — en konkret "samlat"-känsla per runda.
- **[Quick] Mjuk damm-övergång.** Cross-fade scenen mellan nivåer (ny vattenton/ny tid på
  dygnet) i stället för hård rebuild, så världen känns sammanhängande.

### Karaktär & berättelse
- **[Deep] En fiskare + mottagare.** Sätt Bobo/Zacke på en liten brygga vid spöets pivot som
  *håller* spöet och reagerar (lutar sig, jublar vid fångst), och en figur vid hinken som tar
  emot och firar. Ger spöet en hand och fångsten en publik — och ett spel-specifikt slut.

### Ljud
- **[Quick] Byt UI-blipp mot fiske-SFX via pipelinen.** Plask, metall-kläck, plopp-i-hink,
  vatten-ambient (se [[real-audio-sfx]]). Behåll rösten för det pedagogiska ("Metall!"/"Trä!").

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Speltestat med drag (errorCount 0; skärmdump
  verifierad: spö + magnet mitt i fångst, anka guppar undan, hink + ⭐-räknare). Inga
  kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] förstärkt metall/trä-lärande + [Quick] riktiga
  vatten-/metall-ljud + [Medium] synligt fylld hink** — knyter ihop pedagogiken, ljudet och
  "samlat"-känslan kring en redan mycket stark mekanik.
