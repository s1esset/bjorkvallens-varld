# Studsmatta (`studsmatta`)
> ⚙️ fysik · mixed · 2–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En glad kanin 🐰 studsar oändligt på en elastisk studsmatta (teal matt-linje, orange ben,
riktig matter.js-kropp). Uppe i skyn svävar **morötter 🥕 och stjärnor ⭐** som mål. Jag DRAR
själva mattan: **i sidled** flyttas studs-pelaren (sikta under ett mål), och **neråt** spänns
mattan som en slangbella — ju längre ner, desto högre/snabbare studs, och den höjd jag sätter
**blir kvar** tills jag flyttar den. En kraftmätare till höger visar spänningen. Tap = en liten
extra-studs (fallback för de minsta).

Studsa upp och NUDDA alla mål (generös 72px-radie) → firande + stjärna + klistermärke + ny,
högre/bredare nivå (fler mål, längre upp, mer åt sidan). Inget kan misslyckas: kaninen studsar
vidare, en räddnings-studs fångar den om den faller bredvid, och auto-hjälp sänker mattan (7s)
och – om det dröjer – glider kaninen garanterat till målet (13s). Idle ~6s → talad ledtråd.

**Funkar bra:** kontrollen (dra mattan x = sikte, y = höjd som *stannar*) är en ovanligt rik,
novell mekanik för åldern; squash/stretch på kaninen + dip i mattan ger fin juice; no-fail är
vattentätt; exit-säkert.

*(Skärmdump: ängsscen, studsmatta med kanin i luften, två gula stjärnor som mål, full
kraftmätare till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet (nyligen ombyggt) ville ge EN tydlig men djup kontroll: dra mattan i x (sikta) och y
(spänn för höjd, värdet kvarstår = riktig höjd-/hastighetskontroll), så barnet *styr* var och
hur högt kaninen studsar — inte bara "tryck". Mål i skyn på olika höjd/sida tvingar fram att man
varierar både läge och spänning. Tre lager auto-hjälp (sänk → glid) garanterar att varje mål
nås utan straff, och tap-boost släpper in de allra minsta.

## 3. Vad gör det lättjefullt / tunt

Den rikaste kontrollen i buntan — men den motarbetas av spelet, och världen är tom:

- **Auto-centreringen slåss mot ditt sikte.** Varje bildruta drar `_update` kaninen mot mattans
  mitt (`vx += dx*0.012`, plus en mittdragning i `_land`). Du flyttar mattan i sidled för att
  sikta, men kaninen sugs hela tiden tillbaka till mitten — sidledskontrollen känns mosig och
  delvis bortkopplad från utfallet. Den ena halvan av din kontroll motverkas av koden.
- **Auto-hjälpen spelar nivån.** Vid 13s utan fångst görs kaninen statisk och *glider* till
  målet och samlar det (`_glideToGoal`); vid 7s sänks mattan åt dig. En passiv spelare klarar
  allt utan att sikta en enda gång.
- **Höjd-via-drag-ner är abstrakt för de minsta.** "Dra mattan neråt → kaninen studsar högre"
  är en fin idé men ett indirekt orsakssamband en 2-åring sällan greppar (mätaren hjälper lite).
- **Kaninen är en stum prop.** Söt squash, men den tittar inte, ler inte mot målen, säger inget.
- **Målen blir inget.** Morötter/stjärnor är bara emoji som försvinner vid fångst — ingen samlas
  i en korg, ingen äter moroten, ingen "titta vad jag plockat".
- **Tom värld + generisk belöning.** Statisk äng bakom; vinst är standard `bigCelebration`.
- **Ljudet är tunt.** `boing`/`soft`/`pling`/`magi`. Ingen stigande "höjd-ton" ju högre kaninen
  flyger, inget "wheee" på vägen upp.

Kort sagt: *en riktigt fin kontroll som spelet både motarbetar (centrering) och kringgår
(glid-hjälp)* — och kaninen + målen saknar liv.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Lätta på auto-centreringen.**~~ Redan byggd (anti-vingel 0,008 per bildruta,
  `index.js:294`; byggd 2026-07-01, se §5) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Skjut auto-glidet senare / gör det mjukare.**~~ Redan byggd (`ASSIST_DELAY` 10 s,
  `GLIDE_DELAY` 18 s, :52–53; byggd 2026-07-01) — uppdagat 2026-09-23.

### Variation & överraskning
- **[Quick] Rörliga & speciella mål.** En ballong som sakta driver i sidled, ett moln som
  gömmer en stjärna, en gyllene jätte-morot (värd extra) — så varje nivå överraskar.
  ✅ *Gyllene jättemoroten klar 2026-09-23 (v1.251.0):* ungefär var sjätte nivå är ett mål en
  guldmorot, 1,4× så stor (bara konsten — fångsten är samma avstånd), räknas dubbelt i korgen
  och får en egen arpeggio + gnistskur (`GULD_CHANS` :69, `makeMal` :982, fångst :649).
  Kvar: ballongen som driver och molnet som gömmer en stjärna.
- **[Quick] Mat på studsmattan.** Då och då studsar ett extra föremål (en boll, en fjäder) som
  ändrar studsen lekfullt.

### Juice
- ✅ ~~**[Quick] Höjd-ton.**~~ Klar 2026-09-23 (v1.251.0): en låg glidton uppåt vid varje studs
  (C5 → G5/C6/E6 efter studskraften, :385, strypt till en per 250 ms) och en fallande när
  kaninen vänder i luften (:274). Kvar och **blockerat**: det talade/inspelade "wheee" (nytt
  klipp, TTS och MOSS nere).
- **[Quick] Kaninen lever.** Glada ögon som tittar mot närmaste mål, utsträckta ben i toppen,
  ett litet "hopp!"-ansikte — utöver dagens squash.
  ✅ *Ögonen klara 2026-09-23 (v1.251.0):* pupillerna är egna noder som glider mot närmaste
  kvarvarande mål, räknat i kaninens eget (lutande) rum, och mot Bobo när allt är fångat
  (`_titta` :848). Kvar: utsträckta ben i toppen och ett "hopp!"-ansikte.

### Progression
- ✅ ~~**[Medium] Samla det du fångar.**~~ Redan byggd (korgen fylls, `_toBasket` :556 +
  `_fillBasket` :542; byggd 2026-08-06, se §5) — uppdagat 2026-09-23.

### Karaktär & berättelse
- ✅ ~~**[Deep] Ge kaninen ett varför.**~~ Redan byggd (picknicken med Bobo, `_buildPicnic` :499 +
  `_boboMunch` :591; byggd 2026-08-06, se §5) — uppdagat 2026-09-23.

### Ljud
- **[Quick] Riktiga SFX** (studs-boing, morots-knapr, "wheee") via SFX-pipelinen
  ([[real-audio-sfx]]); variera vinst-stinget. *2026-09-23:* studs-boinget är ett riktigt klipp
  (`public/audio/sfx/boing.mp3`, spelas vid stora studsar) och vinststinget varieras av skalet.
  Morots-knapret och "wheee" är **blockerade** på SFX-pipelinen (MOSS nere).

## 5. Status / loggar

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_winLevel` spelade själv vinstljud
  och konfettiregn i samma tick som `complete()` — strukna (WIN_CHEERS sägs före och står kvar).
  Nytt: sällsynt gyllene jättemorot (räknas dubbelt), höjdton upp och ned per studs, och
  kaninens ögon följer närmaste mål. §4 stämd mot koden: 4 punkter var redan byggda, 1 blockerad.

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Nyligen ombyggt (dra-matta x/y-kontroll) — kontrollen är stark men motarbetas av auto-centrering.
- Rekommenderad första-omgång: **[Medium] lätta på auto-centreringen** (frigör den fina
  sidledskontrollen) + **[Quick] höjd-ton + rörliga mål + levande kanin** för känsla och liv.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Medium+Quick]:** auto-centreringen lättad
  från autopilot till anti-vingel (per-frame-drag 0.012→0.008; landnings-mittdrag 0.03→0.018 +
  behåll mer egen sidled-fart 0.4→0.5) så barnets sidled-drag på mattan ger en kännbar
  sidled-studs. Auto-glidet skjutet senare (ASSIST 7→10 s, GLIDE 13→18 s) → fler egna studsar
  innan spelet tar över. Räddnings-studsen kvar → no-fail intakt. errorCount 0.
- 2026-08-04: **Andra omgången** (errorCount 0) — P0 ASSETS och en äng med liv.
  - **Kaninen ritas** (var 🐰-emoji): öron med rosa insida, ljus mage, tassar, morrhår, kinder
    och ett leende. **Buggfix i samma veva:** fysikkroppen snurrar fritt, så den ritade kaninen
    hamnade upp-och-ner och blev oigenkännlig — vyn hålls nu ~upprätt med en liten lutning åt
    färdriktningen (`link`-onUpdate), precis som en figur ska bete sig.
  - **Målen ritas** (var ⭐/🥕-emoji): morot med blast och årsringar, guldstjärna med glans.
    Kraftmätarens ⬆️-emoji är ersatt av en ritad pil.
  - **Ängen lever** (§3 "tom värld"): staket, tre träd, blommor och grässtrån bakom
    studsmattan i stället för bara en gradient med två kullar.
- 2026-08-06: **[Deep] Kaninen fick ett varför** (spår "20 spel från 🔧 till ✅").
  - Ny **picknick i högerkanten**: filt, korg och Bobo som väntar på maten. Varje fångad
    morot/stjärna **flyger till korgen** (`_toBasket`) i stället för att bara försvinna,
    korgen **fylls synligt** (`_fillBasket` ritar det insamlade) och Bobo studsar och
    gnistrar varje gång (`_boboMunch`). Vid nivåvinst gör han en större gest — picknicken
    är serverad. Kaninen samlar inte längre i tomma luften.
  - **Placeringen krävde två försök.** Första läget (x=1140) lade Bobo rakt på kraftmätaren
    (x=1206). Nu x=1052, och picknicken byggs **sist** så den ligger i förgrunden —
    studsmattans högra stolpe kan nå x=1150 vid full högerdragning och glider nu snyggt
    bakom picknicken i stället för att ritas ovanpå Bobo.
  - Den svävande `🥕`/`⭐`-texten vid fångst är borta — saken flyger till korgen i stället.
  - Exit-säkert: `_boboIdle`, flyg-tweens (`_flyTweens`) och skal-tweens dödas i `destroy`.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): stjärnorna ritas av delade `makeStjarna` (`lib/foremal.js`).
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
