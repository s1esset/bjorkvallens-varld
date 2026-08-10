# Studsbollar (`studsbollar`)
> ⚙️ fysik · mixed · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En glad himmelsscen (sol, moln, grön mark). På en liten avskjutningsplatta nere till
vänster vilar EN redo-boll. Jag greppar den och drar för att välja riktning + kraft — en
prickad kastbåge (`AimLauncher`) visar var bollen hamnar — släpper, och bollen flyger i en
riktig matter.js-båge mot en glödande flätkorg till höger. På vägen ligger tre vilande
mål-/hinder-bollar som skottet kan studsa mot (riktig kollision) och knuffa vidare in i
korgen för en extra poäng. En stor knapp nere till höger växlar bolltyp: **Studsig 🤾**
(lätt, hög studs) ⇄ **Tung 🪨** (tung, lågt momentum) — valet syns på skottet.

Mätaren uppe i mitten (korg + N basketbollsplatser) går bara UPP. Når jag `need` (3–6)
bollar i korgen: firande + stjärna + klistermärke, korgen flyttas längre bort/krymper, ny
nivå. Missar studsar bara vidare i gropen (mjukt ljud), och efter två missade skott hjälper
spelet med en **garanterad lobb** rakt i korgen. Idle ~6s → talad ledtråd + bollen "andas".

**Funkar bra:** sikta-och-skjut-känslan är riktigt tillfredsställande, bågen är ärlig
(kalibrerad preview), no-fail är intakt, mätaren och nivåstegringen finns, exit-säkert.

*(Skärmdump: sky-scen, glödande korg till höger, en boll i flykt + en boll nere i korgen,
en lila hinder-boll i fältet, avskjutningsplatta nere till vänster, "Studsig"-knapp i hörnet.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet är tydligt: en fysik-korglek där barnet styr utfallet med **två** kontroller
(sikta+skjut OCH bolltyp), inte en knapp som gör samma sak. Den tidigare versionen spawn:ade
en ny boll vid varje klick (kaos); omdesignen begränsade till EN boll i taget + ett fast
antal hinder-bollar per nivå, så varje skott blir ett *val*. Idén med materialbyte var att
massa/studs ska kännas i bågen och i hur hinder-bollarna knuffas — ett frö av "fysik som
leksak". Assist-lobben och den uppåtgående mätaren garanterar framgång utan straff.

## 3. Vad gör det lättjefullt / tunt

Stark grund, men en kräsen blick ser genvägarna:

- **Hinder-bollarna är nästan inert dekor.** De tre seedade bollarna (x 520/650/780) ligger
  still i gropen. I praktiken siktar barnet rakt på korgen och hinder-bollarna spelar sällan
  någon roll — "bonuspoängen" via studs är ett lyckokast, inte ett val. De *lever* inte
  (driver inte, rullar inte, väntar inte på något).
- **Bolltyp-valet påverkar sällan utfallet.** Både Studsig och Tung når korgen via samma
  preview-assisterade båge; det finns ingen bana/hinder där tyngd vs studs *måste* användas.
  Två val utan konsekvens = ett val för mycket på pappret, för lite i praktiken.
- **Assist-lobben spelar nivån åt dig.** Efter två missar glider bollen i en garanterad båge
  rakt i korgen (`_assistGlide`). Snällt — men en passiv spelare ser spelet lösa sig självt.
- **Korgen är en prop.** Den glöder och studsar lite, men ingen tar emot bollen, ingen figur
  jublar — bara generisk konfetti (`bigCelebration`) + ett basket-emoji som flyter upp.
- **Scenen är tom tapet.** Sol + två moln + en grön remsa. Ingen publik, ingen maskot, inget
  liv bakom mekaniken. Gropen ("golvgrop") känns kal.
- **Ljudet är funktionellt men platt.** `whoosh`/`plopp`/`correct` per skott; studsljuden är
  så hårt strypta (>=140ms, fart>6) att de oftast tiger. Ingen stigande kombo-känsla när en
  boll knuffar en boll som knuffar en boll in i korgen.

Kort sagt: ett *kompetent* siktespel där den andra kontrollen (bolltyp) och hindren ännu inte
betyder något, och korgen saknar mottagare/själ.

> **2026-08-04 — andra omgången genomförd** (errorCount 0). Se §5 för vad som gjordes;
> flera punkter nedan är därmed avbockade.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gör hinder-bollarna meningsfulla.** Lägg en eller två **studs-plattor/ramper**
  mellan plattan och korgen, och placera mål-bollar så att en välsiktad studs *via* en boll
  ger en tydlig bonus (extra gnista + en "kombo"-emoji). Då blir fältet ett pussel man läser,
  inte dekor.
- **[Medium] Ge bolltyp en konsekvens.** Inför nivåer/hinder där valet spelar roll: en
  klibbig "kardborr-vägg" som bara den tunga bollen tränger igenom, eller en låg ribba som
  bara den studsiga hoppar över. Behåll no-fail (fel typ studsar bara tillbaka, försök igen).
- **[Deep] Levande gropbollar.** Låt hinder-bollarna sakta rulla/guppa i gropen så de blir
  *rörliga* mål — lite mer sikte, mer liv — med fortsatt generösa träffytor.

### Variation & överraskning
- **[Quick] Specialbollar.** Ibland en glittrande "stjärnboll" som ger en extra mätar-plats,
  eller en stor "ballong-boll" som studsar extra högt. Rotera per nivå så tur 2 ≠ tur 1.
- **[Quick] Varierande korgplacering** finns redan (flyttar/krymper) — lägg till att korgen
  ibland sitter på en liten *kulle* eller gungar långsamt i sidled på högre nivåer.

### Juice
- **[Quick] Stigande kombo-ljud.** När en boll knuffar en boll in i korgen: en uppåtklättrande
  pling-kaskad istället för tystade studsar. Skärm-mikroskak skalar med bollens fart i korgen.
- **[Quick] Korg-reaktion.** Korgen "slukar" bollen (öppningen squashar), nät-ring krusar,
  och en liten dammpuff far upp — i stället för bara ett emoji som flyter.

### Progression
- **[Quick] Synlig samling.** Låt bollarna stapla sig synligt i en hink/på en hylla över nivåer
  (samma idé som bubbelbok) så det känns som att man *bygger* något.

### Karaktär & berättelse
- **[Deep] En mottagare vid korgen.** Maskoten Bobo (eller ett djur) sitter vid korgen, hejar
  när man siktar, sträcker upp armarna och fångar bollen, och gör en egen vinst-dans i stället
  för generisk konfetti. Ger en anledning att bry sig om varje skott.

### Ljud
- **[Quick] Bind upp riktiga SFX** (studs, "swish", korg-plopp) från SFX-pipelinen
  ([[real-audio-sfx]]) när MOSS kör; variera vinst-stinget per nivå.

## 5. Status / loggar

- 2026-08-10 🎨 **D1: golvet fick ljus från horisonten** (`ec9a241`, v1.122.0).
  Golvet låg på **70 290 px i EN ton** (`_plattprobe --medbakgrund`) — spelets största fält.
  Löst med den delade `groundFill()` i `lib/form.js`.
  **Värt att notera:** scenens egen markfyllning (`6789698`) träffade det INTE. Spelet skickar
  `ground: false` till `createScene` och ritar sitt eget golv med en hårdkodad `0x86d27a` —
  samma värde som `meadow`s `ground`, alltså en kopia av en scenkonstant. Talet rörde sig
  därför inte en pixel av scenändringen, och det var precis det som avslöjade var fältet låg.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **70 290 → 20 372 px**, grönt ute
  ur topp-3.

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] kombo-ljud + korg-reaktion + specialboll** — störst
  upplevd lyft för minst risk; sedan **[Medium] meningsfulla hinder/bolltyp** för riktig agens.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Alla tre Quick-punkterna byggda:
  (1) **Stigande kombo-ljud** — bollar som går i korgen tätt efter varandra (t.ex. en knuffad
  hinder-boll) triggar en uppåtklättrande pentatonisk pling-kaskad (`audio.tone`) + en
  mjuk skärm-mikroskak (`shake` på `_root`) som skalar med bollens fart in i korgen, med en
  "Kombo!"-text vid ≥2 i rad. (2) **Korg-reaktion** — korgen "slukar" bollen: öppningen
  squashar och studsar tillbaka (`_basketGulp`), en nät-ring krusar (`ripple`) och en liten
  sandfärgad dammpuff far upp, i stället för bara ett svävande emoji. (3) **Specialbollar** —
  `SPECIAL_CYCLE` roterar per nivå (tur 2 ≠ tur 1): en **stjärnboll** (gyllene, vit stjärna)
  som knuffas i korgen fyller en EXTRA mätar-plats (+2 + burst + egen röstberöm), och en stor
  **ballong-boll** (rosa, med knut) som studsar extra högt (låg täthet, hög restitution).
  No-fail intakt, exit-säkert (nya tweens dödas i `destroy`, `killTweensOf(_basketView.scale)`).
  Testad (errorCount 0, skärmdump sedd: stjärnboll i fältet, glödande korg, mätare fyller).
- 2026-08-04: **Tredje omgången** (errorCount 0) — mottagare, levande grop och en scen.
  - **Mottagaren Bobo vid korgen** (§4 [Deep]): ritad figur som vaggar bredvid korgen (och
    **flyttar med den** mellan nivåerna), sträcker upp armarna och hoppar vid varje boll i
    korgen, och gör en längre vinstdans när mätaren blir full. Gate-punkt 4 var den enda
    kvarvarande — nu uppfylld.
  - **Levande gropbollar** (§4 [Deep]): målbollarna som ligger i gropen får en svag,
    långsam sidkraft så de rullar fram och tillbaka. De är rörliga mål i stället för dekor —
    kraften är så liten att träffytan förblir generös och en boll i rörelse aldrig störs.
  - **Scenen fylld** (§3 "tom tapet"): trästaket längs gropkanten, tre träd, en vimpelrad
    högt uppe (publikkänsla) och grässtrån i gropen.
  - **P0-brott åtgärdat:** repliken "Stjärnboll! Extra poäng!" nämnde poäng — utbytt mot
    "Stjärnboll! Så fin!".
  - **P0 ASSETS:** mätarens korg- och bollikoner ritas nu (var 🧺/🏀-emoji i cirklar, exakt
    det regeln förbjuder); det svävande 🏀 vid varje korg är borttaget (⭐ kvar för stjärnboll).
  - **Bugg:** `gsap.delayedCall` för nivåbytet → `ctx.later()`.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): alla bollar (vanlig, tung, stjärnboll, ballongboll) ritas av delade `makeBoll` (`lib/foremal.js`). Den tunga bollens två gropar ritas vidare i kroppens egen Graphics — de är dess kännetecken, inte en dager.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-09 ✅ **Exit-bugg fixad [Quick]** (v1.70.0): en boll som gjort mål tweenas 0,2 s ner i korgen och hade redan lämnat `_balls`/`_shot` — `destroy` hittade den inte och tweenen skrev till en förstörd Container. Ny `_malflykt`-mängd töms i destroy. Latent sedan tidigare; A2:s ändrade övergångstiming gjorde den deterministisk (rött 3/3 med, grönt 3/3 utan — växelvis mätt). Nu 3/3 gröna, 0 pageerrors.
