# Magnetfiske (`magnet-fiske`)
> 🧩 drag · drag · 2–4 år · status: ✅ marknadsklar

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
- ~~**Variationen är bara "fler saker + snabbare simning".**~~ **Delvis åtgärdad 2026-08-10
  (`c41d451`):** nivå 2 lägger till en riktig ny *regel* (poler — lika färg knuffar bort,
  vänd magneten), inte bara fler ikoner. Kvar av punkten: fortfarande inga sällsynta
  *fångster* — ingen gammal stövel som skämtfångst, ingen skattkista, ingen guldfisk.

## 4. Förbättringar & förhöjningar (plan)

> ✅ **ATGARDER #1 + #2 fixade 2026-08-07** (se §5). Kvar som *observation* från den mätningen,
> INTE fixad (utanför `/fixa`-uppdraget): fältradien `R_FIELD = 300` täcker en stor del av
> dammen, så ett doppande mitt i dammen drar in allt inom radien på ~1,5 s. Det är i linje med
> no-fail-designen, men om det ska kännas mer som *sikte* än *dammsugare*: krymp radien eller
> låt fältet bara verka i en kon framför/under magneten.

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

- 2026-08-10 ✨ **Poler från nivå 2** (`c41d451`, v1.94.0) — Spår 3 P3/B3.
  `lib/magnet.js` fick `polaritet` + `polDra(body, pol)`: **pol 0 = omagnetiserat järn och
  dras av BÅDA polerna**, pol ±1 = en egen magnet där lika stöter bort och olika drar.
  Returvärdet är signerat, så tecknet ÄR villkoret spelet läser (samma form som
  `knuff()`s närhetsvillkor).
  **Designbeslutet är gränsdragningen, inte fysiken.** Spelet är appens yngsta (2–4 år) och
  en polregel lägger ett VILLKOR i kärnloopen. Därför är **nivå 0–1 orörd** — ingen knapp,
  ingen blå magnet, ingen vriden bild — och polerna är nivå 2:s nya idé, inte allas.
  Från nivå 2 byts EN vanlig metallsak mot en röd och en blå stavmagnet (dammen växer med
  en sak, inte tre); magnethuvudet bär den aktiva polens färg; vänd-knappen (Ø112 px,
  +24 px halo) visar den färg magneten BLIR. Att vanlig metall dras av båda polerna är
  både den riktiga fysiken och no-fail-garantin: dammen kan aldrig låsa sig.
  **Två tal är mätta, inte valda:**
  1. `stotFart` 7 px/steg mot dragets 14 — ett omvänt 1/r-fält är en katapult precis vid
     centrum, och pondväggarna är 40 px.
  2. `stotRadie` 170 < radien 300. **Med samma radie åt båda håll pressades saken 315 px ut
     ur ett 300 px fält på 1,5 s och kunde aldrig vändas hem igen** — leken låste sig om
     barnet inte råkade följa efter. Knuffen är därför ett NÄRFÄLT: saken glider ut till
     knuffkanten, stannar där, och ligger fortfarande långt inne i dragets radie.
  **Medvetet inkonsekvent:** en stavmagnet som redan sitter fast blir kvar när polen vänds
  (fastklistrade kroppar läser aldrig fältet igen). Den andra vägen är värre — vänd-vinken
  kan vända *åt* barnet mitt under bärningen, och då hade hjälpen slagit ur fångsten rakt
  framför hinken.
  Mätt: `_faltprobe` 9 nya mått (järn lika åt båda håll · tecknet · taket · ingen tunnling
  mot väggen · en vändning räcker: 202 px ute → fångad på 1,1 s · exit) och `_magnetprobe`
  avsnitt **D** 8/8 i riktiga spelet (nivå 0–1 utan poler/knapp · en röd OCH en blå på
  nivå 2 · den bortstötta fastnar aldrig på 5 s jakt · 0 tunnlingar · knappen vänder · en
  vändning ger fångst på 2,1 s från 209 px). `_idleprobe` 0 · `_tystprobe` utan fynd.
  **Två sondbuggar rättade före koden** (mönstret igen): avsnitt B lämnade musknappen
  NEDTRYCKT genom fyra skärmbyten och rev spelet mitt i D:s mätning, och `nav.go` som kommer
  medan routern är `_busy` **kastas tyst** (`Nav.js:32`) — sonden mätte hela tiden nivå 0
  medan den trodde sig titta på nivå 2, utan ett enda konsolfel. D laddar därför om sidan
  per nivå. Ett tredje mått var falskt grönt: jakten slutar med magneten *på* saken (0,3 px),
  så "fångbar efter 0,0 s" mätte bara att fastna-spärren släpper — inte att fältet drar hem
  den. Magneten ställs nu 200 px bort före vändningen.
- 2026-08-10 🐛 **Ankan fanns inte i dammen** (`bd54a8f`). `korkPool` stod kvar med
  emoji-strängar (`'🦆'`/`'🛟'`) sedan emoji→ritat-migreringen, medan `makeThing()` matchar
  sorts-id (`'anka'`/`'badring'`). Okända namn faller igenom till sista grenen, så **varje
  icke-metall på nivå 0–2 ritades som en TRÄBÅT** — spelets pedagogiska ankare, gummiankan,
  dök upp först på nivå 3.
  **Varför det överlevde tio nivåer är lärdomen:** `MATERIAL` saknar också nyckeln `'🦆'` och
  föll tillbaka på `'Trä'` — vilket råkar vara **sant om en båt**. Rösten sa alltså rätt sak
  om fel föremål, testet var grönt och skärmdumpen såg trovärdig ut. Det syns bara om man
  jämför bilden mot vad koden PÅSTÅR att den ritar.
  Guard: `_magnetprobe` avsnitt **C** bygger nivå 0–3 och kräver att varje sak heter något
  `makeThing` har en gren för, plus att ankan faktiskt finns. Två sondbuggar rättade på vägen
  (`snap()` litade på att modulen svarar fast den är en singleton som lever kvar efter
  `destroy()`; nivåsvepets bibliotek-bounce rev den nymonterade omgången eftersom
  skärmövergången tar ~0,4 s — därför ligger avsnitt C sist).
- 2026-06-30: Doc skriven (granskning + plan). Speltestat med drag (errorCount 0; skärmdump
  verifierad: spö + magnet mitt i fångst, anka guppar undan, hink + ⭐-räknare). Inga
  kodändringar ännu.
- 2026-07-02: Första-omgång implementerad (rekommenderad omfattning + billig juice):
  - **[Medium] Förstärkt metall/trä-lärande.** Ny `MATERIAL`-karta (`🦆/⛵ → 'Trä'`, `🛟 → 'Gummi'`).
    `_fniss` säger nu i lugn takt (strypt via `this._lastWhy`, ~3,5 s) VARFÖR saken inte
    fastnar — röst "Trä! Magneten gillar inte trä." / "Gummi! Magneten gillar inte gummi." +
    `floatText` med materialordet; däremellan bara ett glatt "Hihi!". `it.emoji` sparas nu på
    varje sak. Behåller no-fail (bara röst/vingel, aldrig straff).
  - **[Quick] Riktiga vatten-/metall-ljud.** Plask via `audio.tone` + `ripple` när magnetspetsen
    doppas i dammen (övergång torr→våt, `this._inWater` i `_update`). Metalliskt "kläck"
    (`tone` square 240→560 Hz) + `ripple` ovanpå `match` i `_stick`. Mjukt "plopp" (`tone`
    320→130 Hz) + gul `ripple` i hinken i `_deliver`.
  - **[Medium] Synligt fylld hink.** Ny `_bucketPile`-container; `_addToBucketPile(emoji)` lägger
    en liten kopia av fångsten i staplade rader (3/rad) ovanpå hinken med `bounceIn`. Rensas per
    runda i `_buildPond` via `_clearBucketPile()`; tweens dödas i `destroy`.
  - Nya imports: `ripple`, `bounceIn`. Testat: `node scripts/test-game.mjs magnet-fiske --url
    http://localhost:5173 --drag "560,130>400,400;400,400>1150,510"` → errorCount 0, samt
    `--taps "560,130"` → errorCount 0 (skärmdump verifierad: damm, spö+magnet fångar 🐟/🥫,
    🦆 guppar, hink + glödring + ⭐-räknare; inga stray-bars).
  - Deferred: [Deep] sorterings-final (två hinkar), [Deep] fiskare/mottagare (Bobo på brygga),
    [Medium] skämt-/skattfångster (🥾/🧰/guldfisk), [Quick] per-typ egen rörelse (S-kurva/snurr),
    [Quick] cross-fade damm-övergång, förinspelade MOSS-SFX (nu procedurell `tone`).
- 2026-08-07 (`/fixa`, ATGARDER #1 + #2): **båda felen hade samma grundorsak — krafterna var
  aldrig kalibrerade mot matters enheter.** matter räknar `velocity += (force/massa) · steg²`
  med steg = 16,667 ms, så en acceleration `a` ger `a · 277,78` px/steg direkt och
  `a · 4629,6` px/steg i längden (mätt mot matter-js, inte gissat). Spelets konstanter var
  satta som om force vore hastighet → ~280× för starka.
  - **#1 "allt sitter redan fast vid start".** Uppmätt före: **5 av 5 metallsaker fast innan
    första bildrutan hann provtas**, toppfart 79 px/steg, saker rakt igenom dammens 40 px
    väggar. Två fel i ett: fältet var absurt starkt, OCH det var påslaget medan magneten
    hängde PARKERAD i luften 115 px från översta spawn-raden. Nu: krafterna anges i px/steg
    och räknas om med `SPEED_TO_A`, och fältet verkar **bara när magneten är doppad**
    (`inWater`) — plask-ögonblicket betyder något nu. Uppmätt efter: **0 av 5 fast efter 8 s
    utan input**, toppfart 2,6 px/steg, 0 tunnling. `scripts/_idleprobe.mjs` `idleFramsteg: 0`.
  - **#2 "de fastklistrade sakerna skakar".** Fastklistrade kroppar pinnas till sin slot varje
    bildruta men KROCKADE fortfarande: slottarna ligger 38 px isär medan kropparna har 38 px
    radie, så solvern sprängde isär klasen varje steg och nästa bildruta teleporterades den
    tillbaka. Uppmätt före: offseten mot magneten svängde **53 px** med **47 px hopp mellan
    bildrutor** medan magneten hölls stilla. Fix: `it.body.isSensor = true` i `_stick`.
    Uppmätt efter: **0,1 px spann, 0,1 px hopp**. Bonus: klasen bråkar inte längre med de
    saker som simmar fritt.
  - Samma kalibrering gällde simfarten (`SWIM_BASE/PER_LEVEL` nu i px/steg), anka-knuffen
    (`DUCK_PUSH`) och nivå-3-strömmen. Diagnostikloggen: `maxSpeed 44 → 1`,
    `collisions 55 → 0`, `fysik/hog-fart risk:tunnling` borta. Sond: `scripts/_magnetprobe.mjs`.
- Rekommenderad första-omgång: **[Medium] förstärkt metall/trä-lärande + [Quick] riktiga
  vatten-/metall-ljud + [Medium] synligt fylld hink** — knyter ihop pedagogiken, ljudet och
  "samlat"-känslan kring en redan mycket stark mekanik.
- 2026-08-09 ✅ **Kraftfältet flyttade ut i `lib/magnet.js`** (v1.78.0, spår 3 runda P0).
  Magnetens drag (∝ 1/avstånd med tak) och ankans mjuka knuff är nu SAMMA fält åt två håll,
  ur ett delat `Magnetfalt`. Spelets egen `SPEED_TO_A` är borta: px/steg→kraft-omräkningen
  bor i `speedToAccel()` i `physics.js` tillsammans med hela härledningen, och räknas nu
  per kropp ur dess egen `frictionAir`. Två mätbara skillnader, båda avsiktliga: dt² är
  **exakt** (277,7778) i stället för spelets avrundade `277.78`, och fältkanten är
  **inklusiv** — en sak som råkar ligga exakt på 300 px dras in i stället för att stå kvar
  för evigt. Uppmätt (`node scripts/_faltprobe.mjs`): **fångsttiden identisk steg för steg**
  från 80/150/220/290 px (15 · 41 · 74 · 116 steg), banorna sammanfaller inom 2·10⁻⁴ px
  över 2 sekunders lek. Spelsonden `_magnetprobe.mjs 3` oförändrad: 0 självfångade på 8 s,
  0 tunnlade, toppfart 2,7 px/steg.
