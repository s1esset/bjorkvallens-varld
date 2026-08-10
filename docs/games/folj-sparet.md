# Följ Spåret (`folj-sparet`)
> 🧩 minne · tap · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En ljusgrön ängmatta. En liten figur (🐰/🐶/🐱/🦊, slumpas per runda) står till vänster och
vill hem till sitt 🏠 till höger. En rad lysande fotspår 👣 ligger i en mjuk slingrande våg
mellan dem, med en svag prickad ledtråd som visar banan. Först spelar spelet upp sekvensen:
fotspåren tänds ett i taget i gult med ett `pling` och en studs (demofas). Sedan trycker jag
på dem i samma ordning — rätt nästa fotspår lyser grönt, gnistrar (`correct`), och figuren
tar ett glatt litet skutt fram dit. Fel fotspår (eller ett redan tänt) ger mjukt vingel +
`soft`, aldrig en nollställning. Två fel i rad → röst-hjälp + mjuk puls på rätt fotspår.
Hela spåret klart → figuren skuttar in i huset och krymper genom dörren, firande + stjärna +
klistermärke, sedan byggs en ny, längre runda (3→7 fotspår; från nivå 3 blir tänd-ordningen
blandad, inte vänster-till-höger). "Visa igen"-knappen nere till vänster spelar upp demon på
nytt. Idle ~6s → röst + puls på nästa fotspår.

**Funkar bra:** banan är vacker och läsbar (våg + prickad ledtråd), fotspåren är stora
(Ø116 + 72px hit-halo), figuren-hoppar-fram ger härlig orsak-verkan, no-fail är intakt,
berömmet är sparsamt ("Ja!" en gång/runda så det inte tjatar), shuffle-ordningen från nivå 3
gör det till ett *rent* minnesspel och inte bara "tryck vänster-till-höger". Mycket exit-säkert
(varje tween/timeline/timer spåras och dödas). En charmig, väldesignad sekvenslek.

*(Skärmdump: grön äng, 🐶 till vänster, tre 👣-plattor i våg, 🏠 till höger, prickad ledtråd,
"Visa igen" nere till vänster.)*

## 2. Ursprunglig plan & tankeprocess

Ett "mjukt sekvensminne" (kodkommentar): tänd vägen → härma vägen → hjälp figuren hem.
Minnesutmaningen kläs i en *berättelse* (kaninen vill hem) så att den abstrakta "kom-ihåg-
ordningen" får ett mål och en känsla — varje rätt tryck för figuren närmare hem, vilket är
mer motiverande för ett barn än att bara tända rutor. Banordningen följer alltid figur→hus
(visuellt logiskt), medan *tänd*-ordningen blir icke-linjär på högre nivåer för renare
minnesträning. No-fail bärs av "Visa igen" + idle-puls + två-fel-hjälp.

## 3. Vad gör det lättjefullt / tunt

Stark grund, men flera billiga drag som en kräsen förälder märker:

- **Figuren är bara en emoji som glider.** 🐰/🐶/🐱/🐱 hoppar fram men reagerar inte — inget
  ansiktsuttryck, inget "kom igen!", inget pirr framför rätt fotspår. Den är en bricka som
  flyttas, inte en kompis man hjälper. Huset är lika inert (lyser inte upp, öppnar ingen dörr
  förrän slutet).
- **Fotspåren är identiska tomma plattor.** Samma `circle` + 👣 överallt. Inget liv mellan
  tändningarna (ingen idle-andning), och de gömmer aldrig något (en blomma, en morot) — noll
  överraskning.
- **Ljudet är tunt och TTS-aktigt.** Demon = samma `pling` om och om; rätt tryck = `correct`;
  beröm = Web Speech "Ja!". Fotspåren har ingen stigande tonhöjd (steg 1 låter som steg 7),
  så örat får ingen hjälp att minnas sekvensen.
- **Scenen är en bar matta.** En grön rektangel med en prickrad. Ingen värld runt omkring
  (inga blommor, träd, fjärilar, ingen stig som *ser ut* som en stig), inget tema-skifte per
  nivå. Runda 1 och runda 10 är samma äng.
- **"Vägen hem" känns inte som en väg.** Fotspåren är fristående cirklar; figuren hoppar i en
  rät linje mellan dem snarare än att *följa en slingrande stig*. Den fina vågformen i datan
  syns knappt eftersom inget ritas mellan punkterna utom svaga prickar.
- **Belöningen är generisk.** Figuren-in-i-huset är en fin detalj, men firandet i övrigt är
  samma `bigCelebration` + `progress.complete()` som alla andra spel. Inget "huset tänds, en
  lampa lyser i fönstret, röken ryker"-tema.
- **Demon kan kännas lång/passiv vid 7 steg.** Barnet sitter och tittar i flera sekunder utan
  att göra något; inget håller handen sysselsatt under demofasen (ingen "tryck-med"-takt).

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Levande figur man bryr sig om.** Ge figuren ett litet ansikte/uttryck: den
  tittar mot nästa fotspår, pirrar/lutar sig framåt när det är dags, jublar (studs + "!") vid
  varje rätt skutt. Då hjälper barnet en *kompis* hem, inte en bricka.
- **[Deep] Rita en riktig slingrande stig.** Dra en mjuk kurva (quadratic/bezier) genom
  fotspåren så banan *ser ut* som en stig i gräset; fotspåren ligger på stigen. Figuren följer
  kurvan (inte räta hopp). Vägen blir en värld, inte spridda prickar.

### Variation & överraskning
- **[Quick] Gömda fynd i fotspåren.** Vart 3:e–4:e fotspår gömmer en liten blomma/morot/stjärna
  som plockas upp när figuren skuttar dit (flyger till en liten samling-hörna) → "en till!"-känsla.
- **[Medium] Tema per nivå.** Rotera äng → strand → snö → skog (bakgrund + figur + hus-skrud),
  samma mekanik. Tar bort "samma matta varje gång".

### Juice
- **[Quick] Stigande tonhöjd på fotspåren.** Låt fotspår 1..N spela en stigande skala i
  demon *och* vid härmning → örat får en melodisk ledtråd till ordningen (samma grepp som
  Härma Melodin borde ha), och varje runda bygger mot ett litet crescendo vid huset.
- **[Quick] Spår-efterklang.** Ett tänt fotspår lämnar en kvardröjande grön glöd/avtryck så
  den färdiga delen av vägen *syns lysa* bakom figuren (känsla av framsteg).

### Progression
- **[Quick] Synlig "hemfärds-mätare".** Eftersom alla fotspår ingår i vägen syns redan
  framstegen som tända fotspår — förstärk med ett litet hus-ljus som tänds starkare ju
  närmare figuren kommer.
- **[Medium] Aktiv demofas.** Låt barnet (frivilligt) trycka *med* under demon utan straff
  ("klappa takten") så handen inte bara väntar — gör den långa 7-stegsdemon levande.

### Karaktär & berättelse
- **[Medium] Huset firar.** Vid hemkomst: dörren öppnas, ett ljus tänds i fönstret, en liten
  rökpuff ur skorstenen, figuren vinkar i dörren — ett spel-*specifikt* slut i stället för
  generisk konfetti.

### Ljud
- **[Quick] Riktiga klipp via SFX-pipelinen.** Byt `pling`/`correct` mot mjuka, distinkta
  fotsteg-/pluttoner och ett glatt "hemma!"-sting (se [[real-audio-sfx]]). Lägg en lugn
  ängs-ambient (fågelkvitter, vind) i bakgrunden.

## 5. Status / loggar

- 2026-08-10 🎨 **D1: ängen fick ljus i stället för att vara en tvättad panel**
  (`fd9df54`, v1.97.0). Ängen var `COLORS.green` @ alpha 0.16 över skalets kräm — en enda
  tvättad ton (#e4edd0). Nu en cachad linjär `verticalFill` som spänner OM exakt den tonen,
  så det är samma äng; det är bara ljuset som tillkommit. Spelet ritar dessutom sin egen
  mark i stället för att luta sig mot skalets `COLORS.bg`.
  **Mätt** (största enskilda fältet, bakgrunden medräknad): **595 215 → 53 848 px**
  (65 % → 5,8 %).
  ⚠️ **Den här posten är också en lärdom om mätningen.** D1-kön rankade spelet LÄGST av
  sina tre (24 %) och det var fel: `_plattprobe` räknar bort exakt EN ton som "bakgrund",
  och här var den borträknade tonen **ängen själv**. Det verkliga läget var äng 65 % + ram
  24 % = **89 % av skärmen i två toner**, alltså det värsta av de tre — inte det minsta.
  Sonden har nu flaggan `--medbakgrund` och blindfläcken står i dess filhuvud.
- 2026-06-30: Doc skriven (granskning + plan). Speltestat (errorCount 0; skärmdump verifierad:
  äng, 🐶, fotspår i våg, hus, prickad ledtråd, "Visa igen"). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] stigande tonhöjd på fotspåren + [Quick] gömda fynd
  + [Medium] levande figur som tittar/jublar** — gör "hjälp kompisen hem" känslomässig och
  ger örat en melodisk minnes-ledtråd.
- 2026-07-02: Första-omgången implementerad (errorCount 0, skärmdump verifierad).
  - **[Quick] Stigande tonhöjd:** ny `toneFreq(k)` mappar sekvenssteg → C-dur pentatonisk skala
    (`TONE_BASE` C5 + `PENTA`-halvtonssteg). Demon spelar `ctx.services.audio.tone(...)` per steg
    i `_playDemo` (ersätter platt `pling`), och rätt tryck i `_onTap` spelar samma ton + en
    oktav-glitter-ton — att följa spåret låter nu som en liten melodi som crescendo:ar mot huset.
  - **[Quick] Gömda fynd:** nya `FINDS` + `_collectFind(ctx, fp)`. Vart 3:e fotspår (`i % 3 === 2`
    i `_build`) får ett dolt `fp.find`; vid rätt skutt dyker det upp och flyger (exit-säker
    proxy-tween + `destroyed`-guard, spårat i `this._findTweens`) till en samling i `this._finds`
    uppe till höger, med `reveal`-ljud + `floatText('En till!')`. Töms/dödas per runda + i `destroy`.
  - **[Medium] Levande figur:** `_hopRabbit` tar nu `ctx`, kastar ett glatt `floatText('!')` och
    en squash-&-stretch-studs i landningen; ny `_lookEager()` lutar figuren mjukt (yoyo-rotation)
    mot nästa förväntade fotspår efter demon och efter varje skutt (killad vid tap/win/build/destroy,
    `rotation` nollställd överallt figuren återställs).
  - Deferred: [Deep] riktig slingrande bezier-stig, [Medium] tema per nivå (strand/snö/skog),
    [Medium] aktiv "tryck-med"-demo, [Medium] huset firar (dörr/ljus/rök), [Quick] hus-ljus-mätare,
    [Quick] riktiga SFX-klipp + ängs-ambient via SFX-pipelinen.
