# Knuffa Tornet (`knuffa-tornet`)
> ⚙️ fysik · drag · 2–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En glad himmel med sol och moln. En riktig kran står på planen: en mast + horisontell
skena med en stor gul **krankärra** som hänger en tung grå **rivningskula** i ett RIKTIGT
rep (matter.js `Constraint` = pendel). På en stenavsats till höger står ett torn av
färgglada klossar med en 👑-krona överst. Jag kan: **greppa kulan** och dra den bakåt/upp
längs pendelbanan (en prickad båge visar svinget, färgen går vit→gul→orange med kraften)
och släppa → gravitationen svingar ner den i tornet; **dra krankärran** i sidled för att
välja var kulan hänger; trycka **Tyngd** (Liten/Mellan/Stor — riktig matter-massa via
`Body.scale`) och **Byt rep** (Styvt = stel pendel / Elastiskt = töjbar slangbella med
startfart ∝ töjning). En grön mätare längst ner fylls per kloss som ramlar av avsatsen;
när alla ligger nere + kronan fallit → firande, stjärna, klistermärke och ett större torn.

Missar är mjuka: en tyst puff + gnistror. Efter 2 missar kommer en automatisk hjälp-sving
(styvt rep, stor kula, full spänning), efter 3 knuffas alla kvarvarande klossar av sig
själva — tornet faller ALLTID. Idle ~6s → röst-recue + kulan studsar.

**Funkar bra:** den riktiga pendel-/repfysiken känns trovärdig och rolig; tre genuina
kontroller (greppa+sikta, flytta kran, tyngd, rep) ger äkta agens över *hur och var*;
prickbågen och kraftfärgen lär ut kraft; no-fail-trappan är genomtänkt; exit-säkert.
En stark fysik-MVP som nyligen fått rep/pendel-uppgraderingen.

*(Skärmdump: kran med rep + grå kula uppe till vänster, 3-kloss-torn med krona på stenavsats, Tyngd/Byt rep-knappar nere.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver målet tydligt: ge barnet **mer makt över hur OCH var kulan faller** —
inte bara "släpp och titta". Därför tre lager av kontroll (sikt-drag, kran-position, tyngd,
rep-typ) ovanpå en trovärdig matter.js-pendel, så samma scen kan lösas på många sätt. Den
pedagogiska kärnan är orsak-verkan i fysik: tyngre kula → mer rörelsemängd → fler klossar;
elastiskt rep → slangbella → annan bana. No-fail-trappan (puff → hjälp-sving → knuffa allt)
garanterar succé utan att straffa. Krock-ljuden togs medvetet bort på begäran för att hålla
känslan mjuk. Allt ritas programmatiskt (Pixi + emoji), inga externa assets.

## 3. Vad gör det lättjefullt / tunt

Trots stark fysik finns billiga drag en kräsen spelare/förälder märker:

- **Smällen är stum.** En rivningskula som krossar ett torn är *hela* fantasin — men
  `_onCollision` spelar med flit INGET slagljud (bara en tyst puff var 0,12s). Det mest
  tillfredsställande ögonblicket i spelet saknar sitt "KRASCH". Mjukt ≠ ljudlöst; en duns
  kan vara rund och snäll utan att vara en buzzer.
- **Hjälp-trappan spelar banan åt en.** Vid 2 missar svingar spelet automatiskt, vid 3
  flyger alla klossar av sig själva (`_knockAllOff`). Garantin är rätt, men ett barn som
  bara tittar får full vinst på ~10s utan att ha knuffat något — agensen som planen hyllar
  kan kringgås helt passivt.
- **Klossarna är döda rekvisita.** Det är färgade rundade rektanglar utan ansikte, utan
  reaktion, utan ljud. De "lever" inte (vinglar inte när kulan närmar sig, ler inte, piper
  inte när de ramlar). Tornet har ingen karaktär att bry sig om — bara kronan är speciell.
- **Tornet är en enkel stapel.** `_layoutFor` ger rader×kolumner med stigande täthet — men
  alltid samma rektangulära mur. Inga former, inga specialklossar (tung sockel, studsig,
  ömtålig glaskloss, fastlimmad), ingen variation som gör att *valet* av tyngd/rep spelar
  olika roll bana för bana.
- **Mätaren är abstrakt.** En grön stapel som fylls säger lite för en 2-åring. Ingen
  räkning, ingen "X klossar kvar", ingen figur som reagerar när den fylls.
- **Scenen är statisk tapet.** Sol + moln rör sig inte, ingen publik, ingen maskot. Vid
  vinst kommer den *generiska* konfettin (samma som alla spel) — ingen spel-specifik finish
  (kran som bockar, arbetar-Bobo som jublar, dammoln när muren rasar).
- **Ljudpaletten är tunn.** `whoosh` vid släpp, `plopp` vid kloss-nere (strypt), `magi`
  vid krona/hjälp. Ingen stigande kombo-ton när flera klossar ramlar i rad, inget
  rep-spänn-ljud när man drar, ingen "rasande mur"-kaskad.

Kort sagt: fysiken är äkta och kontrollerna rika, men **slaget är ljudlöst, klossarna
är själlösa, och hjälpen kan spela klart åt barnet**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Ge tillbaka en *snäll* smäll.** Lägg ett mjukt, rundat duns-/träklots-ljud vid
  kraftig kula-träffar-kloss i `_onCollision` (skala volym med `pair.speed`, behåll
  throttlen). Det är ingen buzzer — det är belöningen för en bra sving. Lägg en liten
  skärm-mikroskak som skalar med slagkraft.
- **[Medium] Låt hjälpen *bjuda in* istället för att spela klart.** Innan auto-svinget:
  flytta kulan till perfekt läge och låt den **blinka/andas "släpp mig!"** så barnet gör
  sista trycket självt. Auto-knuffa-allt blir då sista, sällsynta utvägen — inte ett
  resultat passivitet ger på 10s.
- **[Deep] Special-klossar som gör tyngd/rep meningsfullt.** Tung sockelkloss (kräver Stor
  kula), studsig kloss (elastiskt rep studsar vidare), staplad "ömtålig" glaskloss som
  spricker i gnistror. Då blir *valet* av verktyg ett pussel, inte bara smak.

### Variation & överraskning
- **[Quick] Tornform varierar per nivå.** Pyramid, bro, två torn med glapp, krona längst
  bak — `_layoutFor` returnerar en form-mall istället för bara rader×kolumner. Tur 2 ≠ tur 1.
- **[Medium] Gömda fynd i tornet.** Var 3:e bana göms en ⭐/🎈 bakom en kloss som flyger
  upp när den ramlar — en liten "en till!"-morot.

### Juice
- **[Quick] Klossarna lever inför slaget.** När kulan är nära: närmsta klossar **vinglar
  lätt** (förväntan). När en ramlar: snabb squash + en liten "aj/hoppsan"-piip-emoji.
- **[Quick] Rasande-mur-kaskad.** När ≥3 klossar ramlar inom kort: stigande pling-kaskad +
  ett litet dammoln (`puff`) vid avsatsens kant. Belönar en fet sving.
- **[Quick] Rep-spänn-feedback.** Mjukt stigande "gnissel/spänn"-ljud medan man drar kulan
  bakåt (tonhöjd ∝ kraft), släpp-whoosh som idag.

### Progression
- **[Medium] Konkret mål-räknare.** Byt/komplettera den abstrakta stapeln mot små
  kloss-ikoner som tänds (som `valpens-bajs` slot-prickar) eller "klossar kvar: 3" i
  ikon-form — läs-fritt men begripligt.

### Karaktär & berättelse
- **[Deep] En anledning att riva.** En liten arbetar-Bobo i hjälm som väntar, hejar vid
  bra sving och jublar/bockar med kranen vid vinst — ersätt den generiska konfettin med en
  spel-specifik finish (muren rasar i dammoln, Bobo planterar en flagga på rivningsplatsen).
- **[Quick] Ge klossarna ansikten.** Två prickögon + leende på varje kloss gör tornet till
  "gänget" man knuffar — direkt mer charm, noll fysik-risk.

### Ljud
- **[Quick] Riktiga klipp via SFX-pipelinen** ([[real-audio-sfx]]): trä-duns, sten-skrap,
  rep-spänn, mur-ras. Idag är allt procedurella blippar.
- **[Quick] Variera vinst-stinget** + lägg en lugn bakgrunds-ambient (fågel/vind) så scenen
  inte är ljudtyst mellan svingar.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad mot rep/pendel-bygget i commit 33178c3). Inga
  kodändringar i denna omgång.
- Rekommenderad första-omgång: **[Quick] snäll smäll + skärmskak + klossar med ansikten/
  vinglar** — återinför spelets saknade kärn-belöning och ger tornet själ till låg risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Återinförde en *snäll* smäll i
  `_onCollision`: en mjuk, rundad träduns via `audio.tone` (sine 150→78 Hz) vars volym
  skalar med slagfarten, plus en mjuk skärm-mikroskak (`_screenShake` → exit-säkra
  `shake` på scenroten, intensitet ∝ kraft, kappad ≤10px) — behåller 0,12s-strypningen så
  inget distar. Gav klossarna själ: `makeBlock` ritar nu ett glatt ansikte (två prickögon
  + leende); nya `_spookBlocks` låter närmaste stående kloss darra av förväntan (SCALE-tween
  — fysik-länken rör bara position/rotation) när kulan svingar nära; `_onClear` ger en snabb
  squash + en liten "hoppsan"-emoji (strypt som plopp). Allt exit-säkert (shake-tween dödas
  i `destroy`, scale-tweens städas via befintlig `killTweensOf` i `_clearTower`/`destroy`).
