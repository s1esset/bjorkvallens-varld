# Studsmatta (`studsmatta`)
> ⚙️ fysik · mixed · 2–5 år · status: 📝 plan klar

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
- **[Medium] Lätta på auto-centreringen.** Låt sidledskontrollen faktiskt styra var kaninen
  landar — minska/dröj centreringskraften så att flytta mattan ger en kännbar sidled-studs.
  Behåll en mjuk mitt-dragning bara som anti-vingel, inte som en osynlig autopilot.
- **[Quick] Skjut auto-glidet senare / gör det mjukare.** Behåll no-fail, men låt barnet få
  fler studsar att lyckas själv innan kaninen glider — så känns fångsten som *deras*.

### Variation & överraskning
- **[Quick] Rörliga & speciella mål.** En ballong som sakta driver i sidled, ett moln som
  gömmer en stjärna, en gyllene jätte-morot (värd extra) — så varje nivå överraskar.
- **[Quick] Mat på studsmattan.** Då och då studsar ett extra föremål (en boll, en fjäder) som
  ändrar studsen lekfullt.

### Juice
- **[Quick] Höjd-ton.** En ton som stiger med kaninens höjd på väg upp och faller på väg ner;
  ett mjukt "wheee" vid de stora studsarna. Mattan vibrerar lite kvar efter ett hårt studs.
- **[Quick] Kaninen lever.** Glada ögon som tittar mot närmaste mål, utsträckta ben i toppen,
  ett litet "hopp!"-ansikte — utöver dagens squash.

### Progression
- **[Medium] Samla det du fångar.** Morötter landar i en korg/kaninens mage (mätt-mätare) i
  stället för att bara försvinna — något att se växa över nivåer.

### Karaktär & berättelse
- **[Deep] Ge kaninen ett varför.** Den samlar morötter till en picknick / matar en kompis vid
  kanten som hejar och firar — egen finish i stället för generisk konfetti.

### Ljud
- **[Quick] Riktiga SFX** (studs-boing, morots-knapr, "wheee") via SFX-pipelinen
  ([[real-audio-sfx]]); variera vinst-stinget.

## 5. Status / loggar

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
