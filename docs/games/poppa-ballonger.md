# Poppa Ballongerna (`poppa-ballonger`)
> 🎈 motorik · tap · 2–4 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En ljus himmel med sol och drivande moln. 5–9 glansiga ballonger i olika storlekar
sväver lugnt UPPÅT och vaggar mjukt i sidled (sin-vagga + lätt tilt). Jag trycker på en
ballong → den squashar (1.22×0.82 → 0), spricker med en vit ring + färgad partikelskur +
"pop"/"pling" < 100ms, och försvinner. Ibland finns EN guldballong (⭐ på magen) som ger
extra konfetti, gnistor, ett uppflytande ⭐ och en bonusstjärna. På låga nivåer är rundan
ofta en **räknerunda**: rösten säger poppen på svenska ("ett, två, tre…").

När alla ballonger i rundan poppats: mjuk skärmskak, delat firande (complete = beröm +
konfetti + stjärna + klistermärke) och en ny, lite större/snabbare runda fylls på (tak 9
ballonger, fart upp till 78). Ballonger som svävar ut över toppen respawnar mjukt nedtill
(oändlig ström). Tomt tryck ger 'soft' + ring + närmaste ballong wobblar. Idle ~6s →
talad nudge + en ballong "andas".

**Funkar bra:** ballongerna är vackra (volymskugga, botten-skuggning, stor + skarp glans,
knut, böjt snöre), pop-juicen är saftig, no-fail intakt, räknandet sår ett litet
pedagogiskt frö, parallax (stora stiger lugnare) ger djup. Stabil, snäll MVP.

*(Skärmdump: blå/grön/lila/gul ballong på himmelsscen med sol och moln.)*

## 2. Ursprunglig plan & tankeprocess

Ett rent orsak-verkan-tryckspel för de allra yngsta (2-åringar): "tryck → något kul händer,
alltid". Designintentionen (kodhuvudet) var lugn, oändlig poppning utan slut eller miss,
med guldballong som sällsynt wow och en valfri talad räkning som gör det till en mjuk
försmak av siffror. Stigande fart/antal per nivå ger känslan att man "blir bättre" utan att
det någonsin blir svårt på ett bestraffande sätt.

## 3. Vad gör det lättjefullt / tunt

- **En-utfalls-tryck.** Varje pop är samma händelse: squash → burst → borta. Storleken
  varierar partikelmängden marginellt, men ingen ballong beter sig annorlunda — ingen
  studsar mot en annan, ingen släpper en liten ballong, ingen krymper/växer. Ballongerna är
  **rekvisita, inte varelser**.
- **Tom scen utan publik.** Sol + moln är ren tapet. Ingen figur håller i ballongerna, ingen
  reagerar när de poppar, ingen maskot firar. Bobo/Elvira saknas helt.
- **Guldballongen är den enda överraskningen.** Bortom guld finns inga ballongtyper —
  ingen vattenballong som skvätter, ingen jätteballong, ingen som gömmer en figur.
- **Räkningen är osynlig och valfri.** Den är *enbart talad*; ett barn utan ljud ser ingen
  siffra, ingen räknerad som fylls. Den pedagogiska vinsten försvinner utan röst.
- **Ljudet är tunt UI-blipp.** 'pop'/'pling' är samma som överallt. Ingen ballong-specifik
  klang, ingen stigande tonhöjd vid snabba pop i rad, inget "luft som pyser ut".
- **Generisk belöning.** Samma konfetti+stjärna som alla spel. Inget samlas, inget minns
  mellan rundor (poppade ballonger blir ingenting).
- **Snöret är dekorativt.** Det hänger men gör inget — kan inte dras, klipps inte, ingen
  ballong driver iväg om man missar.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Ballonger som lever.** Låt ballonger guppa mot varandra (billig cirkel-stöt,
  ingen matter.js) och driva i sidled — då blir varje pop ett *rörligt* mål man måste sikta
  på (behåll de generösa 82–90px-halona). En ballong som når toppen utan att poppas kan
  "släppa taget" och flyga iväg med ett litet pys-ljud — en mjuk anledning att hinna med.
- **[Deep] Trådar att klippa.** Vissa ballonger sitter fast i en liten figur/korg nedtill;
  att poppa dem släpper figuren som studsar ner glatt. Ger snöret en funktion och ett mål.

### Variation & överraskning
- **[Quick] Fler ballongtyper:** vattenballong (poppar i en blå skvätt + flera mini-droppar),
  jätteballong (kräver två tryck, första gör en stor wobble), klusterballong (poppar 3 små
  intill sig). Rotera per nivå så tur 2 ≠ tur 1.
- **[Medium] Gömda figurer.** ~1/10 ballong gömmer en söt emoji/djur som flyter upp och
  landar i en liten hylla nedtill (se Karaktär) — något att samla över rundor.

### Juice
- **[Quick] Stigande kombo-ton.** Snabba pop i rad → pling som klättrar i tonhöjd; ett riktigt
  "ballong-pop" + luft-pys via SFX-pipelinen ([[real-audio-sfx]]) istället för UI-'pop'.
- **[Quick] Pop-efterklang.** En kvardröjande, krympande färgdimma + 1–2 gummibitar som
  studsar bort; skärm-mikroskak skalar med ballongstorleken.

### Progression
- **[Quick] Synlig räknerad.** När det är en räknerunda: visa en rad tomma cirklar (1..N)
  upptill som fylls med en siffra/ballong-ikon per pop — då blir räkningen begriplig utan
  ljud. Fortfarande no-fail.
- **[Medium] Färgmål som i `klambubblor`.** Ibland "Poppa de röda!" med en liten visuell
  måltavla i hörnet som fylls vid rätt färg — extra gnistor, aldrig fel vid annan färg.

### Karaktär & berättelse
- **[Deep] Maskot som håller och samlar.** Bobo/Elvira nedtill håller ballong-knippet i
  handen; vid tomt fält drar figuren in de gömda fynden i en "ballongbok". Ger en egen
  vinst-animation istället för generisk konfetti och en anledning att bry sig.

### Ljud
- **[Quick] Riktigt pop + glad röst.** Knyt 'pop' till ett inspelat ballong-pop; lägg en
  mjuk vind/utomhus-ambient för lugn. Variera berömfrasen (verifiera global variation når hit).

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; himmelsscen + 4 ballonger renderar korrekt).
- Rekommenderad första-omgång: **[Quick] synlig räknerad + fler ballongtyper + stigande
  kombo-ton** — störst upplevd lyft för minst risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). (1) Synlig räknerad — en rad
  pluppar (1..N) i HUD:en fylls med färg + studs per pop under räknerundor, så räkningen
  syns utan ljud. (2) Fler ballongtyper som roteras/skalas per nivå: **vatten** (blå skvätt +
  fallande 💧-droppar + låg ton), **kluster** (släpper 3 miniballonger + tre stigande pling),
  **jätte** (kräver en extra kram — första trycket = stor wobble + låg ton, inte en pop).
  (3) Stigande kombo-ton via `audio.tone()` — snabba pop i rad klättrar uppför en pentatonik
  och svalnar efter ~0,7s. `sfx('pop')` auto-uppgraderar till riktigt klipp när MOSS kört.
- 2026-08-04: **Andra omgången** (errorCount 0) — mottagare, samlande och levande mål.
  (1) **Bobo står på ängen** med egen ritad kropp och uppsträckt arm: han puffar till vid varje
  pop, pekar uppåt vid idle-cue och hoppar högt i finishen. Markremsan är inte längre en tom
  platta — grässtrån och blommor. Löser gate-punkt 4 (mottagare) + 5 (karaktär).
  (2) **Gömda kompisar att samla** — en ballong per runda kan bära en vän (katt · groda · bi ·
  uggla · anka) som syns som en *rörlig skugga inuti ballongen*, så barnet kan välja att trycka
  just där (agens, inte tur). Den befriade vännen snurrar, seglar ner till raden bredvid Bobo och
  **stannar kvar mellan omgångar** (`custom.vanner`). Riktigt djurläte via `audio.sample('djur_…')`.
  Ger spelet ett mål över tid: hitta alla fem.
  (3) **Ballonger som knuffar varandra** (billig cirkelstöt, ingen matter.js) — en pop mitt i
  klungan får grannarna att guppa undan, så varje tryck kräver ett nytt sikte i stället för att
  vara rekvisita på räls.
  (4) **Egen finish** i stället för generisk konfetti: Bobo hoppar, kompisraden studsar i en
  pentatonisk våg och en regnbågsbåge ritar sig själv över himlen.
  (5) **P0 ASSETS-fixar:** klusterballongens miniballonger och vattenballongens droppar är nu
  riktiga ritade föremål med egen silhuett, inte 🎈/💧-emoji.
  (6) **Bugg:** `gsap.delayedCall` för respawn bytt mot `ctx.later()` (överlevde spelomgången);
  den nya kompis-silhuettens oändliga tween använder proxy-mönstret så en ny runda mitt i
  animationen inte kan skriva till en nollställd transform.
