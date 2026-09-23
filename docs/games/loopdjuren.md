# Loopdjuren (`loopdjuren`)
> 🎉 roligt · drag · 2–5 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

Tre färgglada rader, en per djur (🐮 ko, 🐶 hund, 🐱 katt), var och en med en loop-bana av tomma
rutor. En genomskinlig gul **spelhuvud-stapel** sveper lugnt vänster→höger över alla banor och
börjar om i en oändlig slinga. Längst ner en bricka med fem dra-block: hopp ⬆️, snurr 🌀, tut 🎺,
klapp 👏 och röst 🎵, plus en tempo-knapp (🐢/🐇).

Jag drar ett block ner i en ruta (eller tappar en ruta för att cykla block-typ). När spelhuvudet
passerar en ifylld ruta gör just det djuret blockets sak i takt: hoppar, snurrar ett varv,
stretchar, dubbel-klämmer eller säger sitt eget läte (riktigt djurklipp via `audio.sample`). En
liten rytm och dans växer fram av sig själv. Jag kan trycka på ett djur för att tysta hela dess
rad (sola ut ett djur), och växla tempo mellan lugnt och snabbt. Inget kan bli fel — ett block som
släpps utanför en ruta puffar snällt bort. När hela varvet rullat och varje aktivt djur spelat
minst ett block firas det en gång (klistermärke), men loopen rullar vidare i all oändlighet.

**Funkar bra:** den öppna sandlådan är genuint Loopimal-aktig, loop-timern är ren ticker-matte
(exit-säker), drag + tap-tap + slot-cykel ger tre vägar in även för de minsta, djur-mute och tempo
är riktig agens, och de riktiga djurläten på röst-blocket är en höjdpunkt. No-fail intakt.

*(Skärmdump: tre djurrader med ⬆️ och 🌀 placerade i banorna, spelhuvud mitt i svepet, blockbricka nere.)*

## 2. Ursprunglig plan & tankeprocess

Intentionen (ur kodkommentaren) var en **öppen, kreativ musiklek i Loopimal-stil** där en låt och
dans *emergerar* ur barnets pyssel utan rätt svar, poäng eller game-over. Designvalet att låta
loopen rulla hela tiden gör att varje nytt block hörs direkt nästa varv — orsak-verkan på en mjuk
takt. Flera ingångar (drag, tap-tap, slot-tap-cykel) sänker tröskeln för 2-åringar, medan
djur-mute + tempo ger 5-åringar något att *styra*. "Klart" är medvetet öppet: ett varv där alla
aktiva djur spelat firas en gång, men leken stannar aldrig — sandlådan är poängen.

## 3. Vad gör det lättjefullt / tunt

Den öppna leken är charmig, men kallad "musiklek" lovar mer än den håller:

- **Det blir aldrig riktig musik.** Fyra av fem block spelar *generiska UI-ljud* —
  `sfx('boing'/'whoosh'/'pling'/'pop')` — utan tonhöjd. Att stapla block bygger alltså ingen melodi
  och ingen harmoni; det blir rytmiska blipp. Loopimals magi är just att lagren *stämmer ihop
  musikaliskt*; här kan två block aldrig bilda ett ackord. Spelet är perkussivt, inte melodiskt.
- **Blocken hör inte ihop med djuren.** En ko som tutar i trumpet är godtyckligt — varje djur har
  samma fem abstrakta block. Inget *instrument per djur*, ingen karaktär i ljudet (kons "röst" är
  fin, men hopp/snurr/klapp är samma för alla).
- **Avatarerna är emoji i en cirkel.** "Dansen" är en liten `pop`/`gsap.to`-studs eller ett
  snurr-varv. Ingen riktig koreografi, inga uttryck, ingen kropp som rör sig — djuren *guppar*,
  de dansar inte.
- **Takten syns knappt.** Spelhuvudet glider, men det finns ingen puls på rutnätet: ingen
  färgblixt i kolumnen på beatet, ingen nedslags-betoning, inget "ett-två-tre-fyr". Utan ljud ser
  ett barn inte *när* nästa ruta spelas.
- **Ingen variation mellan varv eller nivåer.** Samma fem block, samma palett, varje gång. Nivåer
  lägger bara till rutor/djur (3×4 → 3×5 → 4×6). Inga nya block, inga teman, inga överraskningar.
- **Man drar blint.** Det går inte att höra vad ett block *låter* som innan man placerar det —
  ingen förhandslyssning vid tryck på en stämpel.
- **Tyst mellan slagen.** Ingen bakgrundsgroove, inga trummor, inget ambient-komp som binder ihop
  loopen till en "låt". Det blir glesa ljud i tystnad, inte en känsla av musik.

Kort sagt: en fin *rytm-sandlåda*, men den marknadsförs som musik och **gör aldrig melodi** — och
djuren är utbytbara emoji snarare än ett band med var sin röst.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Deep] Stämda instrument per djur.**~~ Redan byggd (`INSTRUMENTS` index.js:46 på
  gemensam pentatonik, 2026-07-01) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Block med tonhöjd.**~~ Redan byggd (skalsteg efter slot-index, `_noteFreq`
  :520) — uppdagat 2026-09-23.

### Variation & överraskning
- ✅ ~~**[Quick] Förhandslyssna vid tryck.** Tryck-och-håll (kort) på en stämpel …~~ Premissen
  bröt mot P0 (inget långtryck), så punkten skrevs om till "stämpelns ljud när den lyfts".
  Klar 2026-09-23 (v1.251.0): Samma pointerdown som DragController lyfter på spelar blockets
  eget ljud ur `_perform` på en neutral marimba-ton (`_stampLjud` :286). Röst-blocket låter som
  djuren i tur och ordning, via sample och aldrig via berättarrösten.
- **[Medium] Nya block/teman per nivå.** Lägg till t.ex. ett "studsa"-block, ett shaker/maracas,
  eller ett "eko"-block på högre nivåer, och byt scenfärg per nivå så varje besök känns nytt.

### Juice
- ✅ ~~**[Quick] Beat-puls på rutnätet.**~~ Redan byggd (kolumnens slots studsar på slaget,
  index.js:477, 2026-07-01) — uppdagat 2026-09-23.
- **[Medium] Riktig dans.** Ge avatarerna ett par extra leder (öron/svans/fötter som studsar i
  motfas) så rörelsen läser som dans, inte bara en skal-pop.

### Progression
- ✅ ~~**[Quick] Spara och återuppta loopen.**~~ Klar 2026-09-23 (v1.251.0): Varje ändring
  sparar `custom.loop` (en rad per djur, `_sparaLoop` :318). Vid start läggs låten tillbaka
  tyst (`_aterstallLoop` :325). Har nätet vuxit sedan sist (3→4 djur, 4→6 fack) läggs det som
  ryms tillbaka och de nya facken står tomma. Firandet kräver att barnet lägger eller byter
  minst ett block den här gången (`_barnetsTur` :501). Annars hade varje öppning gett ett
  gratis klistermärke efter första varvet.

### Karaktär & berättelse
- **[Deep] Ett litet band/scen.** Sätt djuren på en scen med strålkastare som tänds när en rad är
  aktiv; vid firande tar bandet en gemensam "bugning". Ger sandlådan en plats och en själ.

### Ljud
- **[Medium] Mjuk bakgrundsgroove.** En lugn, lågmäld komp-loop (mjuk bas + shaker) som ligger
  under och binder ihop blocken till en känsla av låt i stället för glesa ljud i tystnad. Volym
  diskret så djurens egna ljud hörs.

## 5. Status / loggar

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): Dubbelfirandet fanns inte:
  `complete()` står ensamt, utan egna kopior och utan replik efter. Snabbvinster: ⓵ barnets låt
  sparas och kommer tillbaka nästa besök, även när nätet vuxit. Firandet kräver en egen ändring
  per besök. ⓶ Stämpeln låter som sitt block när den lyfts. Punkten var tryck-och-håll, vilket
  bryter mot P0, och skrevs om. Kvar öppet: [Medium] nya block/teman, riktig dans, groove;
  [Deep] bandet/scenen.
- 2026-06-30: Doc skriven efter källäsning + playtest (errorCount 0, drag verifierad, skärmdump
  granskad). Inga kodändringar. Rekommenderad första-omgång: **[Deep] stämda instrument per djur +
  [Quick] beat-puls på rutnätet** — det enda som gör skillnaden mellan "rytm-leksak" och riktig
  musiklek, plus att takten äntligen syns.
- 2026-07-01 🔧 **Första-omgången byggd (mönster #7):** (1) **Stämda instrument per djur [Deep]** —
  `INSTRUMENTS` (ko bas/sine C3, hund triangle C4, katt marimba C5, gris G3) på gemensam
  pentatonik (`PENTA`); `_noteFreq(id, slot)` → block spelar nu en STÄMD ton via `audio.tone()`
  där skalsteget följer slot-index. Block på olika djur harmoniserar alltid; en rad block stiger
  till en melodi. Röst-blocket kvar som djurets läte ovanpå. (2) **Beat-puls [Quick]** — hela den
  aktiva kolumnens slots studsar mjukt när playheaden når dem → takten syns. Städning: slot-scale-
  tweens dödas i destroy. errorCount 0.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).** Musik-kritiken från §3 var
  redan åtgärdad (stämda instrument per djur på en gemensam pentatonik, beat-puls på rutnätet,
  tonhöjd per slot-index). Det som återstod var **P0 ASSETS**, och det gällde hela spelet:
  - **Djuren var emoji i en gräddvit cirkel** (🐮🐶🐱🐷, 84 px `Text`). Nu ritade huvuden med
    egen silhuett — kons horn och öron, hundens hängöron och tunga, kattens spetsiga öron och
    morrhår, grisens tryne — utan cirkel omkring.
  - **Blocken var emoji i färgade fyrkanter** (⬆️🌀🎺👏🎵). Nu riktiga ritade föremål:
    studsfjäder, snurra, trumpet, två klappande händer och en musiknot. Färgkodningen ligger kvar
    som en mjuk rund glöd bakom föremålet i stället för en ruta.
  - **Takt-knappens 🐢/🐇** är ritad sköldpadda respektive hare.
  - `emoji`-fälten är borta ur `ANIMALS` och `BLOCKS`; spelet har inga `Text`-noder kvar.
  - **Grind:** `npm run check --game loopdjuren` 0 fel · `npm run test` grönt ·
    `_idleprobe 20s` → `idleFramsteg: 0`.
- 2026-08-09 ✅ **Vilorörelse [Quick]** (v1.70.0): djurhuvudena guppar och vaggar i egen takt (skuggan ligger kvar på marken). Delad `feedback.liv()` med egen fas per föremål. Mätt med `_livprobe`: 9,5 px / fasspridning 0,23, 0 tweens kvar efter exit.
