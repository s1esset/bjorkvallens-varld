# Vilket Djur Låter Så? (`vilket-djur-later`)
> 🔤 pedagogiskt · tap · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En solig äng. Uppe i mitten en stor, gul "högtalar/öra"-knapp (🔊) med puls-ring och
markskugga. Nedtill 2–6 gulliga djurkort: en cremebricka med en färgad spotlight-skiva
och en stor djur-emoji som gungar lugnt. Strax efter intron spelas ett **riktigt
djurläte** upp (verifierat: alla 12 djur har egna mp3-klipp i `public/audio/sfx/`,
t.ex. `djur_ko.mp3`) — och om klippet saknas faller rösten tillbaka på onomatopoetik
("Mu! Muu!"). Jag trycker ett kort → 'tap' + studs + ring. Rätt djur → 'correct' +
gnistor + burst + en glad emoji svävar upp, kortet hoppar, och rösten "svarar":
"Det är en ko! Kon säger muu!". Fel → vänlig vingel + 'soft', och lätet spelas snällt
igen. Högtalar-knappen kan tryckas när som helst för att höra lätet på nytt. Antal
kort växer med nivån (2→3→4→6) och fler rätt krävs per stort firande.

**Funkar bra:** att det spelar **riktiga djurläten** (inte bara TTS) är spelets stora
styrka — det är precis det ljud som landar hårdast hos barn. Distraktorer delar aldrig
läte med svaret (groda/anka som båda "kvack" krockar inte), svaret upprepas aldrig två
rundor i rad, repetera-knappen är generös och tydlig, idle-recue lockar med en
andnings-puls på rätt kort, och allt är exit-säkert. Grammatiskt korrekt bekräftelse.

*(Skärmdump: gul högtalarknapp överst, två kort (anka, katt) på äng — nivå 0, 2 kort.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som **ljud→djur**-matchning: barnet kopplar ett läte till rätt
djur och får djuret att "svara" med sitt namn (auditiv diskriminering + ordförråd).
Den uttalade ambitionen var att använda riktiga förinspelade klipp (`audio.sample`)
med TTS-fallback. Svårighet = antal svarsalternativ, växande långsamt; bred djurpool
(12) håller det fräscht. NO-FAIL: fel ger mjuk vingel + repris av lätet, aldrig straff.

## 3. Vad gör det lättjefullt / tunt

- **På nivå 0–1 är det ett myntkast.** Med bara 2 kort (och svaret aldrig samma som
  förra rundan) gissar barnet rätt halva tiden utan att lyssna. De yngsta börjar här, så
  den första upplevelsen tränar knappt diskriminering. Tre kort som golv vore vänligare.
- **Korten är döda — djuret "låter" men *rör sig inte*.** När lätet spelas händer inget
  på korten; det vinnande djuret hoppar först *efter* att man valt rätt. Ingen visuell
  koppling mellan ljudet och djuret som gör det (mun som öppnas, kort som studsar i takt).
- **Ingen fri utforskning.** Barnet kan inte trycka på ett djur bara för att höra vad det
  låter (utan att det räknas som "fel"). För 2-åringar är "tryck → djuret låter" en egen
  glädje; här bestraffas nyfikenhet med en vingel.
- **Enkelriktat: alltid ljud→bild.** Aldrig en vändning (se djuret → välj rätt ljud, eller
  härma lätet). Samma frågetyp varje runda.
- **Övriga ljud är tunna/syntetiska** ('tap'/'pling'/'soft'/'correct') och bekräftelsen är
  TTS. Det riktiga klippet spelas bara som *ledtråd* — inte igen som en stolt "så här låter
  kon!" tillsammans med namnet vid rätt svar.
- **Generisk belöning + statisk äng.** Ingen bondgård, ingen bonde/Bobo som reagerar;
  firandet är samma konfetti+stjärna.

Kort sagt: kärnan (riktiga läten + ren matchning) är stark, men **korten lever inte med
ljudet**, det går inte att utforska fritt, och de lägsta nivåerna är för lätta att gissa.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Höj golvet till 3 kort** (eller 2 kort bara allra första rundan), så valet
  kräver att man faktiskt lyssnar redan från start.
- **[Medium] Lägg till ett fri-utforska-läge / "smek"-tap.** Ett långt tryck eller en liten
  "lyssna"-ikon per kort som spelar djurets läte utan att räknas som svar — nyfikenhet ska
  belönas, inte vinglas bort. (Håll det enkelt: tap = svara, en tydlig öron-ikon = lyssna.)

### Variation & överraskning
- **[Medium] Vänd ibland på det:** visa ett djur stort och spela två läten — "Vilket ljud
  hör DU kon säga?" Eller en "härma"-runda ("Säg muu!") med glad bekräftelse oavsett.
- **[Quick] Fler djur i poolen syns** genom att rotera vilka 12 som kan dyka upp per session
  så att samma fyra inte återkommer.

### Juice
- **[Medium] Låt djuret *göra* lätet visuellt** när det spelas: kortet studsar i takt /
  munnen öppnas / örat-knappen skickar "ljudvågor" mot rätt kort vid repris. Kopplar ljud→djur.
- **[Quick] Vinnardjuret gör en egen liten gest** (kon vickar på huvudet, hönan picker) i
  stället för bara en generell hopp-studs.

### Progression
- **[Quick] Mild kategori-tematik:** bondgårdsdjur först, sedan damm/skog (groda/uggla/bi)
  — grupperar lärandet och ger nivåerna en känsla av nya "platser".

### Karaktär & berättelse
- **[Deep] En bondgård + en bonde/Bobo** som reagerar ("Ja! Det är kon!"), så scenen är en
  värld och firandet en plats-specifik glädje istället för generisk konfetti.

### Ljud
- **[Quick] Spela det riktiga klippet IGEN vid rätt svar**, tillsammans med namnet ("Det är
  en ko! *muu*"), inte bara som ledtråd — då blir belöningen multisensorisk. Klippen finns
  redan ([[real-audio-sfx]]); detta är nästan gratis.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Verifierat: alla
  12 djurläten finns som mp3 i `public/audio/sfx/` + manifest. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] 3-korts-golv + spela riktiga klippet igen vid rätt**
  och **[Medium] djuret rör sig med ljudet + fri-lyssna-ikon** — störst lyft för minst risk.
