# Härma Melodin (`harma-melodin`)
> 🧩 minne · tap · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

Fyra stora färgglada plattor i ett 2×2-rutnät (grön 🐸, röd 🍎, blå 💧, gul ⭐) med en
liten gulnäbbad maskot mitt i. Maskoten blundar ("lyssnar") medan spelet tänder plattorna
en i taget i en sekvens — varje platta studsar, lyser upp med en vit glöd och spelar sin
egen ton (`pling`/`pop`/`reveal`/`flip`). Sedan säger rösten "Din tur!", maskoten ler, och
jag härmar genom att trycka i samma ordning. Rätt tryck → platta tänds + gnistrar + pekaren
flyttas fram. Hel sekvens rätt → firande (konfetti + stjärna + klistermärke) och en ny,
ett steg längre sekvens (2→6). Fel tryck straffas aldrig: mjukt `soft`-ljud, fel + rätt
platta vinglar, maskoten blir nyfiken ("Nästan! Titta igen.") och sekvensen visas om från
början. "Visa igen"-knappen spelar upp på nytt utan kostnad. Idle ~6s → röst + nästa platta
tänds som hint.

**Funkar bra:** plattorna är enorma (280px, hitArea hela rutan), no-fail är vattentätt
(fel = visa om, aldrig nollställning), maskoten ger humör (blunda/le/nyfiken), progression
är mjuk och sparad, "Visa igen" tar bort all frustration. Exit-säkert (alla calls/tweens
spåras och dödas). En solid, lugn minneslek.

*(Skärmdump: 2×2-plattor med 🐸🍎💧⭐, blundande maskot i mitten, "Visa igen" nedtonad.)*

## 2. Ursprunglig plan & tankeprocess

Ett "mjukt, förlåtande Simon-/minnesspel" (kodkommentar): titta+lyssna → härma sekvensen.
Tanken är klassisk Simon men strippad på allt straffande — man kan *aldrig* förlora, fel
visar bara om, sekvensen växer långsamt och kan alltid visas igen. Plattans egen ton ska
göra att en sekvens upplevs som en liten melodi (därav titeln), vilket bygger ljud-minne
ovanpå ordnings-minne. Riktar sig mot de äldre barnen (3–5) eftersom arbetsminne för en
växande sekvens är kärnan. "Oändlig lek" är designmålet: ingen slutskärm, bara längre
melodier.

## 3. Vad gör det lättjefullt / tunt

Grunden är korrekt och snäll, men loopen är en läroboks-Simon utan egen själ:

- **Det är inte riktigt "musik".** Plattans "ton" är återanvänd UI-SFX (`pling`/`pop`/
  `reveal`/`flip`) — inte fyra toner i en skala. Sekvensen *låter* inte som en melodi, den
  låter som fyra olika blipp. Hela kroken i titeln ("Härma Melodin") infrias aldrig i örat.
- **Maskoten är anonym.** En namnlös gräddfärgad cirkel med ögon. Den har humör men ingen
  identitet, inget namn, ingen koppling till världen (maskoten Bobo finns redan i appen).
  Den dansar aldrig till melodin, nickar inte i takt, pekar inte mot rätt platta.
- **Plattorna lever bara när de tänds.** Mellan sekvenserna är de helt stilla rutor. Ingen
  idle-andning, inget litet liv i ikonerna (grodan blinkar inte, äpplet guppar inte).
- **Noll innehållsvariation.** Samma fyra plattor, samma fyra ljud, samma rutnät — runda 17
  ser och låter exakt som runda 1. Det enda som ändras är sekvenslängden. Ingen ny färg,
  inget tempo-skifte, ingen "vänd-på-det"-runda.
- **Belöningen är generisk.** `bigCelebration` + `progress.complete()` är samma konfetti som
  varenda annat spel. Inget melodi-tema firas ("Du spelade hela sången!"), ingen scen-reaktion.
- **Fel-flödet kan kännas långt.** Vid fel visas HELA sekvensen om från början (även på
  längd 6). För ett barn som missade sista trycket är det en lång omtagning — generöst men
  potentiellt tråkigt; ingen "fortsätt-där-du-var"-mildhet.
- **Sekvensen är ren slump.** `Math.floor(Math.random()*4)` per steg → kan ge `2,2,2,2`
  (samma platta fyra gånger i rad), vilket känns som en bugg snarare än en melodi och är
  extra förvirrande att härma.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gör det till riktig musik.** Ge de fyra plattorna fyra *stigande* toner (t.ex.
  C–E–G–C i en glad durskala) via en liten Web Audio-oscillator eller fyra förgenererade
  ton-mp3:er. Då blir sekvensen en faktisk melodi som örat kan minnas — kroken i titeln
  infrias och ljud-minnet börjar bära lika mycket som färg-minnet.
- **[Deep] "Fri-spel"-läge mellan rundor.** Efter ett firande: låt barnet trycka fritt på
  plattorna en stund och göra sin *egen* melodi (plattorna spelar sina toner) innan nästa
  sekvens startar. Ger agens och kreativ paus i en annars helt reaktiv loop.

### Variation & överraskning
- **[Quick] Ingen-repeat-sekvens.** Undvik samma platta två gånger i rad i generatorn (eller
  begränsa till max 2 i följd) så melodin känns avsiktlig, inte slumpig.
- **[Medium] Tema-rundor.** Rotera plattuppsättningen var några rundor: djur-set (🐸🐶🐱🦊),
  frukt-set, väder-set — samma mekanik, ny skrud + nya småljud. Tar bort "exakt likadant
  varje gång".
- **[Quick] Tempo-charm.** Låt en sällsynt "snabb melodi"-runda spela upp lite raskare (med
  förvarning från maskoten) som ett litet wow — fortfarande no-fail.

### Juice
- **[Quick] Tonhöjd + glöd i takt.** Glödens styrka och plattans studs skalar med tonen; vid
  uppspelning lägg en mjuk ljus-svans så ögat följer melodin. Vid härmning: varje rätt tryck
  klättrar en aning i tonhöjd → känsla av att bygga mot ett crescendo.
- **[Quick] Slut-ackord.** När hela sekvensen härmats rätt: spela alla fyra toner samtidigt
  som ett litet ackord + konfetti i alla fyra plattfärgerna.

### Progression
- **[Medium] Mildare fel-omtag.** Vid fel på ett sent steg: visa bara om från *några steg
  bakåt* (eller pulsa nästa rätta platta) istället för hela sekvensen från noll — snabbare
  tillbaka i leken utan att bli lättare på ett bestraffande sätt.
- **[Quick] Synlig melodi-bok.** En liten rad med noter/stjärnor längst ner som fylls per
  klarad sekvens (likt magnet-fiskes räknare) → en "samlat"-känsla över rundorna.

### Karaktär & berättelse
- **[Medium] Ge maskoten identitet (Bobo).** Byt den anonyma cirkeln mot maskoten Bobo som
  *nickar i takt* under uppspelningen, pekar mot rätt platta vid hint, och dansar vid vinst.
  En anledning att bry sig + en egen vinst-animation istället för generisk konfetti.

### Ljud
- **[Quick] Riktiga toner via SFX-pipelinen.** Knyt fyra distinkta ton-klipp till `PAD_SFX`
  (se [[real-audio-sfx]]) i stället för återanvända UI-blipp — den enskilt största
  ljud-vinsten här.
- **[Quick] Mjuk bakgrunds-ambient.** En lugn, låg ton-matta under leken så de tysta
  pauserna mellan sekvenserna inte känns döda.

## 5. Status / loggar

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`ea3654c`, v1.101.0).
  `_plattprobe --medbakgrund` mätte **546 990 px = 59 % av skärmen** i EN ton.
  Plattorna låg som tryck på ett platt papper: ingen yta, inget djup, ingen skillnad
  mellan bordet och det som ligger på det. Bakgrunden är nu en cachad `verticalFill` som
  spänner OM 0xfff0d6, och varje platta har fått en slagskugga. Plattornas EGNA toningar
  valdes bort: de ritas med alpha 0.85, och alpha gick vid det laget inte att kombinera med
  en gradientfyllning någonstans i repot — den väggen löstes senare med `verticalFillAlpha`.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **546 990 → 33 710 px** (59 % → 3,7 %).

- 2026-06-30: Doc skriven (granskning + plan). Speltestat (errorCount 0; skärmdump verifierad:
  2×2-plattor + blundande maskot + nedtonad "Visa igen"). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] riktiga stigande toner + [Quick] ingen-repeat-sekvens
  + [Medium] Bobo som nickar i takt** — gör det till faktisk *musik* och infriar titeln.
- 2026-07-02: Första-omgång implementerad.
  - **Riktig musikalisk tonhöjd [Medium].** Ersatte återanvänd UI-SFX (`PAD_SFX`) med en
    stigande C-durs pentaton: `BASE_FREQ = 523.25` (C5), `PENTATONIC = [0,2,4,7]` (C–D–E–G),
    `PAD_FREQ = PENTATONIC.map(semi => BASE_FREQ * 2^(semi/12))`. `_lightPad()` spelar nu
    `ctx.services.audio.tone({ freq: PAD_FREQ[index], dur:0.42, type:'sine', vol:0.32 })` så
    grön→röd→blå→gul stiger i tonhöjd och sekvensen LÅTER som en melodi. Barnet som härmar
    hör exakt samma toner (ingen pitch-drift). Glöd/studs skalar en gnutta med index (`lift`,
    glow-alpha) så ögat följer melodin.
  - **Ingen-repeat-sekvens [Quick].** `_newSequence()` undviker att samma platta upprepas
    direkt (annars kan `2,2,2,2` kännas som bugg) — vald ton skjuts vidare med
    `(n+1+rand(0..2))%4` om den matchar föregående.
  - **Maskoten nickar i takt [Medium, förenklad].** Ny `_nod()` guppar den (persistenta)
    maskoten nedåt (`y:320→332`, yoyo) vid varje tänd platta, både vid uppspelning och rätt
    härmning → nickar i takt. (Behöll den befintliga humör-maskoten i stället för full
    Bobo-swap; tweens dödas redan i `destroy` via `killTweensOf(this._mascot)`.)
  - **Slut-ackord [Quick, bonus].** `_onRoundComplete()` spelar nu alla fyra toner samtidigt
    (`PAD_FREQ.forEach(... tone ...)`) som ett glatt "klart!"-ackord ovanpå `bigCelebration`.
  - Test: `node scripts/test-game.mjs harma-melodin --url http://localhost:5173 --taps
    "480,160;800,160;480,480;800,480"` → errorCount 0; skärmdump verifierad (2×2-plattor,
    blundande maskot, nedtonad "Visa igen", inga stray-bars).
  - Deferred: [Deep] fri-spel-läge mellan rundor · [Medium] tema-rundor (djur/frukt/väder-set)
    · [Quick] tempo-charm-runda · [Medium] mildare fel-omtag (från några steg bakåt) · [Quick]
    synlig melodi-bok · [Medium] full Bobo-identitet (lib/mascot.js) · [Quick] bakgrunds-ambient.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): bakgrund breddad + ton bytt `COLORS.bg`→0xfff0d6 (exakt creme kan aldrig passera kant-cream — färgen ÄR letterboxen). Testad båda viewports: 0 fel.
