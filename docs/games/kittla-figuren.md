# Kittla Figuren (`kittla-figuren`)
> 🎉 roligt · tap · 2–5 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

En stor, gosig figur (klump / björn / kanin / monster) står mitt på en mjuk godis-scen
(gradient + bokeh). Den andas, blinkar slumpvis och har rosa kinder och ett litet leende.
Jag trycker på en kittelzon — mage, huvud, fötter, kinder, öron/horn — och figuren reagerar
OMEDELBART: den squashar + skuttar, hela kroppen vinglar, munnen slår upp i ett brett skratt,
ögonen knips, gnistror/ringar/skratt-emoji (😄🤭❤️😆) yr vid trycket och ett glatt ljud spelas.
Varje zon har en *egen* krydda: magen poppar + hoppar, en fot sparkar uppåt, huvudet skakar
sidledes, en kind poppar, ett öra/horn vippar fram och tillbaka. En prickrad längst ner fylls.

Vid lägre nivå är det fri kittling (kittla N gånger var som helst → firande). Från nivå 2
blir det en mild **kittel-följd**: en vit glödring andas runt en zon, kittla den → nästa
lyser, tills hela följden är klar. Att kittla "fel" zon fnissar ändå — ALDRIG fel. När målet
nås: stort skratt + lokal partikelskur + delat firande (stjärna + klistermärke), figuren
byter skepnad och en ny runda börjar. Idle ~6s → om-uppmaning + figuren skakar på huvudet.

**Funkar bra:** figuren är riktigt levande (andning, blink, squash, zon-specifika reaktioner),
no-fail är solklart, fyra skepnader ger variation, och kittel-följden ger ett litet mål utan
press. Detta är en polerad, charmig liten karaktärsleksak — bland de bästa "rena" 2-årsspelen.

*(Skärmdump: rosa monster med horn, ljusare mage, fötter, glatt ansikte, 5 prickar i botten.)*

## 2. Ursprunglig plan & tankeprocess

Kodens header: "ren orsak-och-verkan-lek". Målet var det allra enklaste — tryck → fnitter,
alltid — men med inbyggt **anti-upprepningsdjup**: figuren byter SKEPNAD varje runda (egen
färg, egna öron/horn, egna fnitter-repliker) och högre nivå lägger till fler kittelzoner +
kittel-följden. En medveten "ingen svårighet, bara mer att upptäcka"-design för 2–5 år, där
allt ritas programmatiskt så inga assets behövs.

## 3. Vad gör det lättjefullt / tunt

Charmigt, men en kräsen blick hittar genvägarna:

- **Skratt = robottal, inte ett skratt.** Fnittret är *talade ord* via Web Speech
  ("Hihi!", "Hoho!", "Mer kittel!"). TTS som säger "hihi" låter mekaniskt, inte som ett
  barns/figurs faktiska fniss. Det enda riktiga ljudet är generiska `pop`/`pling`/`correct`.
- **Ingen upptrappning.** Tryck 1 och tryck 5 ger exakt samma intensitet — samma squash, samma
  skutt, samma `_giggle()`-paket — och sedan plötsligt firande. Det saknas ett crescendo där
  figuren skrattar HÅRDARE ju fullare mätaren blir (kan inte hålla sig, faller bakåt av skratt).
- **De fyra skepnaderna är i grunden samma rigg omfärgad.** Klump/björn/kanin/monster delar
  identisk kroppslayout, samma magcirkel, samma ögon, samma zonplaceringar — bara färg, öron
  och en nos skiljer. De *känns* som recolors, inte fyra olika varelser med eget beteende.
- **Bara två ansiktslägen.** Stängt leende eller öppet skratt — det är hela mimiken. Ingen
  utstickande tunga, inga skratt-tårar, ingen rodnad som fördjupas, inga ihopknipta-av-skratt
  ögon utöver en snabb skal-yoyo.
- **Figuren rör sig aldrig ur sin pose.** Den står centrerad rakt fram hela tiden; skuttar på
  stället men går aldrig, vänder sig aldrig, lägger sig aldrig ner och skrattar.
- **Fri kittling saknar mål.** På låg nivå finns ingen visuell ledtråd om var man ska trycka —
  de allra minsta petar lite planlöst (prickarna fylls men pekar inte ut en plats).
- **Statisk scen.** Godis-bokehen rör sig inte, ingen rekvisita, inget händer i bakgrunden.

Kort sagt: en **fin men "frusen" karaktär** — samma fniss-loop varje tryck, robotskratt, och
fyra skepnader som beter sig likadant.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Skratt-crescendo.** Låt intensiteten rampa med mätaren: större skutt, snabbare
  vingel, bredare mun, fler skratt-emoji, en lätt skakning som byggs upp — och vid full mätare
  ett "kan-inte-hålla-mig"-utbrott (figuren faller bakåt och sparkar med benen) som flyter rakt
  in i firandet. Då känns slutet *intjänat*, inte plötsligt.
- **[Medium] Posevariation.** Då och då (eller vid hög intensitet) byter figuren pose — rullar,
  faller bakåt, håller om magen — istället för att alltid stå rakt fram.

### Variation & överraskning
- **[Deep] Gör skepnaderna genuint olika.** Kaninens långöron flaxar och täcker ögonen; björnen
  håller tassarna för ansiktet och kikar fram; monstret har flera ögon som alla knips i tur;
  klumpen darrar som gelé. Egen idle-pose per art. Det förvandlar fyra recolors till fyra djur.
- **[Quick] Slumpmässig accessoar per runda** (rosett, hatt, glasögon) som studsar extra när
  man kittlar nära den → en liten "vad har den på sig idag?"-krok.

### Juice
- **[Quick] Riktiga skratt-SFX.** Byt de talade "Hihi!" mot inspelade fniss-klipp (via `npm run
  sfx`) — den enskilt största lyftet. Variera mellan flera giggel-takes.
- **[Quick] Mer mimik.** Tunga ut, ihopknipta ögon, fördjupad rodnad ju mer den skrattar, en
  liten tår av skratt vid crescendot.
- **[Quick] Skratt-emoji-skur som skalar** med intensiteten istället för fast `count`.

### Progression
- **[Quick] Mål-glimt i fri kittling.** Lägg en mjuk glöd/gnista på en slumpzon även på låg
  nivå, så de yngsta har någonstans att sikta — utan att göra det till en följd.

### Karaktär & berättelse
- **[Medium] Art-personlighet i rösten.** Egen kort replik/röstkaraktär per skepnad
  ("Björnen morrar glatt!", kaninen piper) så varje runda har en egen ton.

### Ljud
- **[Quick] Lugn godis-ambient** i bakgrunden + varierat berömsting vid firandet.

## 5. Status / loggar

- 2026-06-30: Doc skriven (ersätter den gamla bygg-specen med en spelar-granskning).
  Speltestad (errorCount 0, skärmdump granskad — monster-skepnad). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] riktiga skratt-SFX + [Medium] skratt-crescendo** —
  tillsammans förvandlar de "fin men frusen" till "den skrattar på riktigt".
- 2026-07-01 🔧 **Första-omgången byggd:** (1) **Skratt-crescendo [Medium]** — en `prog`-
  intensitet (mätarens fyllnad) skalar nu squash-amplitud (`_squash`), skutt-storlek, mun-bredd +
  ögon-knip (`_laugh`) och skratt-emoji-skuren (fler + större ju gladare) → slutet känns intjänat.
  (2) **Skratt-ljud [Quick]** — robot-TTS-tappet ersatt av en synt-"hi-hi" (`_giggleSound` via
  `audio.tone()`) som klättrar i tonhöjd/antal med intensiteten; en `audio.sample('skratt')`-hook
  spelar RIKTIGA inspelade fniss automatiskt när MOSS-pipelinen ([[real-audio-sfx]], #3) kört.
  Städning: oanvänd `ctx`-param bort ur `_buildChar`. errorCount 0, skärmdump bekräftar figuren.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).**
  - **"Fri kittling saknar mål"** — i fritt läge fanns ingen visuell ledtråd alls, så de allra
    minsta petade planlöst. Nu visas en **mjukare** version av glöd-ringen (`_setGlow(z, true)`)
    på en zon, och den hoppar vidare efter varje kittling. Fortfarande helt fritt: alla zoner
    fungerar lika bra, ringen pekar bara ut en plats att börja på.
  - **Skrattårar vid högt crescendo:** över 60 % fyllnad sprutar små ljusblå tårar ut vid båda
    ögonen — figuren kan inte hålla sig längre. Tidigare stannade crescendot vid squash, skutt
    och munbredd.
  - **Läcka #4:** `` `${sp.short} Kittla där det lyser!` `` var en mall-sträng som `check.mjs`
    aldrig hittar — repliken kunde aldrig få ett röstklipp. Skriven som hel literal.
  - **Grind:** `npm run check --game kittla-figuren` 0 fel · `npm run test` grönt ·
    `_idleprobe 20s` → `idleFramsteg: 0`, `efterSpel: 1`. 1 ny replik väntar på röstklipp.
