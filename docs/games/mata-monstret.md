# Mata Monstret (`mata-monstret`)
> 🧩 drag · mixed · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Ett gosigt, skepnadsbytande monster (egen färg/form/öron/namn per runda — Gnaffsa/Bubbel/
Lurvas/Sötis) på en äng. Det ska matas med handritad, glänsande mat (frukt/grönsak/godis). Fyra
**lägen** roterar med rundräknaren: (1) **klassiskt** — dra maten från bordet upp till munnen;
(2) **promenad** — monstret strosar fram och tillbaka, munzonen rör sig med det; (3) **hylla** —
en glidande hylla högst upp; släpp maten så faller den (matter.js) och monstret glider in och
fångar; (4) **plinko** — välj en lucka högst upp (tryck), maten trillar genom ett pinnfält ner i
munnen. Ögonen följer maten, munnen *gapar* när den närmar sig, ett saftigt **tugg** stänger
käken, magen skvalpar, gnistor yr, blink emellanåt. Strikt no-fail: missar ger mjukt ljud +
vingel/puff, och monstret hjälper alltid så maten *alltid* blir uppäten. Allt uppätet → tugg +
mag-skvalp + skutt + konfetti + "Mätt och belåten!", och en ny runda (nytt läge + ny skepnad).
Från runda 3 kan monstret "vilja ha" en favoritkategori (talat).

**Funkar bra:** det är ett av de rikaste spelen i appen — eyetracking, gapande mun, mag-wobble,
blink, fyra distinkta lägen, monster-reskins, riktig fysik i hylla/plinko. Genuint charmigt och
levande, väl städat och exit-säkert.

*(Skärmdump: lila monster med gapande tandad mun mitt på ängen, tomat på bordet, muffins till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodens intent: ett skepnadsbytande monster som matas via *fyra* mekaniker som växlar med barnets
framsteg, så samma "mata"-kärna känns ny gång på gång. Strikt no-fail med generös auto-hjälp
(maten kan aldrig fastna; rundan kan aldrig hänga sig). Favoritkategorin (från nivå 2) sår ett
pedagogiskt frö (frukt/grönsak/godis) utan straff. Allt ritat programmatiskt, återanvänder
DragController, physics, scene och de delade firande-/ljud-tjänsterna. (En äldre build-spec för
detta spel beskrev en enklare 3-bitars en-läges-mun; den är nu överspelad av fyra-läges-bygget.)

## 3. Vad gör det lättjefullt / tunt

- **Auto-hjälpen äter upp agensen (appens återkommande synd).** I hylla/plinko *glider monstret
  alltid till maten* (`_slideMonster` mot `_catchX`) och en hård garanti teleporterar fastnad mat
  rakt ner mot munnen. Följden: i plinko spelar det knappt någon roll *vilken lucka* jag väljer —
  monstret hamnar under ändå. I klassiskt läge flyger maten själv in efter tre missar. Skicklighet
  ska *kännas*, inte krävas — men här krävs den heller aldrig, och valet känns sällan.
- **Favoriten är osynlig och nästan konsekvenslös.** "Idag vill monstret ha frukt" sägs *bara*
  med rösten; ett barn som inte lyssnar ser ingen ledtråd om vad som önskas. Och matar jag fel
  kategori händer inget annat än lite mindre gnistor — preferensen är i praktiken kosmetisk.
- **Ingen synlig mättnad.** Monstret äter 4–6 saker men magen *byggs* aldrig upp — den skvalpar
  och återgår. Vid rundslut är monstret lika smalt som vid start. "Mätt och belåten" sägs men
  syns inte. En växande, rund mage vore den naturligaste belöningsmätaren.
- **Maten försvinner spårlöst.** Den krymper in i munnen och blir inget — ingen "favoritmat-
  hög", ingen tallrik som töms synligt utöver att färre bitar finns kvar.
- **Ljudet är syntetiskt där det skriker efter riktigt.** Tugget är 'match', studsen 'boing',
  yum-frasen är TTS. Ett riktigt mums/krasch/rap (knyt an till [[real-audio-sfx]]) skulle göra
  matandet dubbelt så belönande.
- **Reward generisk.** Trots all egen-animation avslutas rundan med samma delade bigCelebration
  som alla andra spel.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Låt valet avgöra — dämpa auto-glidet.** I plinko: monstret står (eller glider bara
  *sent och synligt*) så att *luckan jag väljer* faktiskt styr var maten landar; en mjuk assist
  kickar in först om maten skulle missa, och då tydligt ("Jag sträcker mig!"). I hylla: monstret
  väntar och fångar med en liten lutning/hopp som belönar bra släpp-timing. Fortfarande no-fail —
  men nu *känns* träffen som min.
- **[Quick] Synlig favorit.** En tankebubbla över monstret med önskad kategori-ikon (🍎/🥕/🍬).
  Rätt kategori → bubblan fylls/studsar; gör preferensen begriplig utan ljud, fortfarande no-fail.

### Variation & överraskning
- **[Medium] Smak-reaktioner.** Monstret gör en rolig "äsch men gott ändå"-grimas på icke-
  favorit och stora glittriga hjärtögon på favorit — utfall som beror på *vad* jag valde, inte
  bara mängd gnistor.
- **[Quick] Sällsynt jätte-godbit** som ger ett extra stort tugg + skärmskak.

### Juice
- **[Quick] Riktig mat-SFX** (mums/krasch/slurp + ett belåtet *rap* vid rundslut) via
  [[real-audio-sfx]] — ersätter 'match'/'boing'/TTS-yum.
- **[Quick] Mage som fylls:** låt magen växa ett snäpp per uppäten bit och bli rund vid "mätt".

### Progression
- **[Medium] Mättnadsmätare som figur.** Den växande magen *är* mätaren; vid full mage rapar
  monstret nöjt och klappar sig — egen vinst-animation istället för generisk konfetti.

### Karaktär & berättelse
- **[Quick] Visa monstrets namn** (liten skylt/talad presentation som redan finns) *visuellt* så
  varje skepnad får identitet, inte bara färg.
- **[Deep] Små personlighetsrepliker** per monster (Gnaffsa fnissar, Sötis blir blyg) för
  återkommande igenkänning.

### Ljud
- **[Quick] Variera fullmätt-frasen + lägg en lugn ambient** så loopen andas mellan rundor.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan; ersätter äldre build-spec). Inga kodändringar.
  Testkörning ren (errorCount 0), skärmdump verifierad (monster med gapande mun, mat på bord).
- Rekommenderad första-omgång: **[Medium] dämpa plinko/hylla-auto-glidet så luckval/timing
  räknas + [Quick] synlig favorit-bubbla + [Quick] mage som fylls** — återför agens och gör
  favoriten begriplig, utan att röra no-fail.
