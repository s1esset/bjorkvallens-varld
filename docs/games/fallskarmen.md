# Fallskärmen (`fallskarmen`)
> ⚙️ fysik · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Zacke eller Lova (slumpas, 👦/👧) hänger i en stor randig fallskärm högt på en ljus himmel med
sol, moln och en grön markremsa. Hen sjunker långsamt rakt ned medan en **vind** (banner uppe:
"Vinden blåser →") vill putta åt sidan; lövpartiklar 🍃 blåser åt samma håll. Jag **håller/drar**
vänster eller höger om fallskärmen för att styra emot vinden, ner mot en lila **studsmatta** med
glödring och 🎯 i mitten. Två kontroller ändrar utfallet: (1) kontinuerlig sid-styrning (med
chevron-pilar ◀▶ som tänds åt det håll jag styr, och tap-fallback för de minsta), (2) en
**tyngd-knapp** nere till vänster (🪶 Lätt / 🪨 Tung) som byter fallfart och hur mycket vinden
biter. Landningen är ALLTID mjuk: mitt på mattan → studsande jubel + firande; bredvid → snäll
auto-glid in som firas som träff; långt bort → glad gräslandning + ny runda (ingen krasch).
Vindbyar växlar riktning på en timer, och en styr-assist växer efter missar så målet alltid nås.

**Funkar bra:** styr-kontra-vind-kärnan är begriplig och taktil, chevronerna + vindbannern +
löven gör krafterna *synliga*, tyngd-knappen är en äkta avvägning (Tung faller snabbare men biter
mindre mot vinden), no-fail är vattentätt med tre snälla landnings-utfall. Skuggan som växer mot
marken ger fин höjdkänsla. Exit-säkert.

*(Skärmdump: randig fallskärm med barn-ansikte, lila studsmatta + 🎯 + glödring, vindbanner uppe, 🪶 Lätt-knapp, lövpartiklar.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): en **styr-mot-störning-lek** där barnet lär sig att hålla emot vinden för
att landa på ett mål — enkel rymdkänsla + orsak-verkan utan tidspress. De ≥2 utfalls-ändrande
kontrollerna är sid-styrning + tyngd-toggle; vinden är den varierande motkraften som gör varje
runda olik. No-fail bakas in med tre landnings-utfall (träff / nära-auto-glid / gräs + omstart)
och en assist som växer per miss (`this._misses`), så även passivt spel landar rätt till slut.
Zacke/Lova är de namngivna förarna (P0).

## 3. Vad gör det lättjefullt / tunt

Solid kärna, men flera tunna drag:

- **Barnet är ett ansikte utan kropp.** `this._kid` är bara en 👦/👧-emoji i selen — ingen kropp,
  inga ben som dinglar, ingen reaktion på vinden eller landningen utöver fallskärmens studs. Ett
  litet "iiih!"/skratt eller dinglande ben vore mycket mer levande.
- **Vinden är konstant per by, inte kännbar i kroppen.** Den syns i banner + löv, men fallskärmen
  lutar bara svagt i *styr*-riktningen (`dir * 0.13`), inte i *vind*-riktningen — så att "vinden
  drar mig" känns mer än det syns på själva skärmen. Kupolen buktar inte i blåsten.
- **Tomt luftrum.** Mellan start (y=150) och mark (y=560) finns bara himmel, moln och löv. Inga
  fåglar, ballonger, moln att glida förbi, inget att samla på vägen ner — fallet är "vänta tills
  marken" snarare än en resa.
- **Målet är passivt.** Studsmattan glöd-andas men reagerar inte när barnet närmar sig; ingen
  publik vid mattan, ingen som väntar på att fånga. 🎯 antyder "prick-skytte" mer än "landa hem".
- **Auto-glid + assist gör mycket av jobbet.** "Nära" (inom 1,8× radien) glider in automatiskt
  och firas som full träff; assisten växer per miss. Bra no-fail, men ett barn som driver med
  vinden landar ändå rätt utan att egentligen ha styrt — agensen kan suddas ut.
- **Tyngd-knappens effekt är svår att se.** Skillnaden Lätt/Tung är fart + vindbett (siffror) +
  en liten kupol-skala; barnet känner den knappt på 400px fall. Den är smart men nästan osynlig.
- **Ljud + röst är tunna.** `tap`/`whoosh`/`pling`/`soft`/`correct`/`celebrate` + TTS ("Nästan!
  Jag hjälper till.", "Hoppsan! Vi provar igen!"). Inget vind-sus som stiger med byn, inget
  tyg-fladder, inget studs-"boing" med karaktär.

Kort sagt: **krafterna är välgjorda men föraren är en själlös emoji och himlen är tom** — det
styrs hem, men det berättas ingen liten resa.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Vind-lut på fallskärmen.** Luta kupolen/föraren lätt i *vindens* riktning (lägg in
  `this._wind`-term i `chute.rotation`-lerpen) så barnet ser och känner att vinden drar — och att
  styrningen rätar upp den.
- **[Medium] Samla på vägen ner.** Strö ut moln-stjärnor/ballonger i luftrummet som ger en liten
  gnista + pip när fallskärmen glider förbi dem — gör fallet till en resa med val (styr lite för
  att nå dem) utan att äventyra landningen.
- **[Medium] Gör tyngd-valet kännbart.** Förstärk Tung visuellt (ihoptryckt kupol, snabbare löv
  som susar förbi, lägre vind-drift) och ge ett tydligt "tungt/lätt"-ljud, så avvägningen syns.

### Variation & överraskning
- **[Quick] Varierade landningsmål:** studsmatta, höstack, vattenpöl (plask), en väntande
  Bobo-famn — roteras per nivå med eget landnings-ljud.
- **[Quick] Vindkast-överraskning:** enstaka kraftig by med extra lövsvärm + ett "ooh!" som ger
  ett kort, lekfullt sväng (fortfarande inom no-fail).

### Juice
- **[Quick] Vind-sus som stiger med byn** (loop vars volym följer `Math.abs(this._wind)`) + ett
  mjukt tyg-fladder på kupolen vid sid-rörelse.
- **[Quick] Föraren reagerar:** dinglande ben (liten pendel-graf under emojin), armar upp, och
  ett "iiih!"/skratt vid landningen.
- **[Quick] Landnings-boing med karaktär** + dammpuff (redan `puff` vid gräs — lägg motsvarande
  vid mattan) och en kort kamera-mikroskak.

### Progression
- **[Medium] "Landningsbok".** Räkna och visa de olika mål-typer barnet landat på (mattan,
  höstacken…) i en liten samling — `landningar` finns redan i custom, ge den ett ansikte.
- **[Quick] Mjuk scen-crossfade** mellan nivåer (gryning → dag → skymning) i stället för hård
  reset.

### Karaktär & berättelse
- **[Deep] Mottagare vid mattan.** Bobo (eller en kompis) står vid målet, vinkar in föraren,
  fångar/kramar vid träff och hejar — en egen vinst-scen i stället för generisk konfetti, och en
  anledning att vilja landa just där.
- **[Quick] Föraren får en kropp** (enkel programmatisk Zacke/Lova som i `gungan`/`spindel-zacke`)
  i stället för bara ett ansikte.

### Ljud
- **[Quick] Riktiga SFX från [[real-audio-sfx]]:** vind-sus, tyg-fladder, studs-boing, plask —
  ersätt syntetblippen; ersätt TTS-fraserna med förgenererade röstklipp.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan, ersätter gammal bygg-spec). Testat headless med
  drag (errorCount 0), skärmdump läst. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] vind-lut på fallskärmen + dinglande ben/skratt + stigande
  vind-sus** — gör vinden och föraren kännbara, störst lyft för minst risk.
