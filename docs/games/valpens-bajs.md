# Valpens Bajs (`valpens-bajs`)
> ⚙️ motorik · mixed · 2–4 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En solig park: gräsmatta (rätt skalad så hela planen är gräs), ett träd, en grusgång och en
blomsterrad längs nederkanten. En söt **valp** (Lovas) tassar runt, en grön **återvinnings-
tunna** står till höger med en glödande mål-ring, och en **skyffel** ligger nere till
vänster. En glasrör-**mätare** med slot-prickar (💩→⭐) visar framsteg.

Jag **trycker dit valpen ska gå** (tap-to-walk; den vänder sig, vaggar/bobbar dit) och när
den stannar lämnar den ibland en liten **bajshög** (med en gullig huk-animation + "plopp" +
💨). Efter ~4s börjar glada **flugor** 🪰 surra runt gammalt bajs (rent komiskt). Jag
**drar skyffeln** över en hög → den plockas upp och följer fingret; drar jag den till
tunnans mun ramlar bajset i, mätaren fylls en prick, och en 💩 flyger upp. Tap-fallback:
tryck en hög → skyffeln flyger dit och skyfflar själv. Fylls tunnan (3 + nivå högar) →
firande, valpen skuttar, tunnan vickar, ny runda.

No-fail genomgående: bajset ligger snällt kvar, bär man fel tappas det mjukt tillbaka
("Hihi!"), idle ~6s ger recue + auto-hjälp (hint-streck → efter 2 → auto-skyffel), och
periodisk **auto-vandring** ser till att det alltid finns bajs att ta.

**Funkar bra:** två genuina motorik-moment (styr valpen + skyffla) med tap-fallback för de
minsta; valpen är charmig och levande (svansvift, bob, huk); flugorna ger komik utan straff;
slot-prickar + glasrör-mätare är läs-fri progress; scenen är rätt grundad och rätt fylld;
exit-säkert. En varm, mysig motorik-MVP.

*(Skärmdump: park med träd + blommor, valp i mitten på grusgången, grön tunna med mål-ring till höger, skyffel nere till vänster.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: en **mys-motorik** om att ta hand om sin valp — styr vart den går (tap-to-walk)
och städa upp (drag med tap-fallback). Det pedagogiska/sociala: ansvar och "städa efter sig"
inramat som lek, aldrig som straff (bajset är komiskt, flugorna roliga). Designen betonar att
tunnan ALLTID fylls (auto-vandring + auto-skyffel) så ingen kan fastna, och att fel-drag är
mjukt (tappas tillbaka med skratt). Bara Lova är namngiven människa; valpen är djur (undantag).
Allt programmatiskt, flugor flyttas i tickern (ingen GSAP → exit-säkra), deposit via
{}-proxy-mönstret.

## 3. Vad gör det lättjefullt / tunt

- **Bajs-spawn känns slumpartad, inte styrd.** Högen dyker upp *ibland* (`_poopChance`) när
  valpen stannar, med 2,5s cooldown — barnet trycker "gå hit", och kanske kommer en hög,
  kanske inte. Kopplingen handling→resultat (kärnan för 2-åringar) är otydlig; ofta är det
  **auto-vandringen** (inte barnet) som producerar materialet att skyffla.
- **Auto-systemen kan spela hela spelet.** Auto-vandring ger bajs, idle-auto-skyffel tömmer
  det, och `_autoHelp` efter 2 idle-cykler skyfflar en hög direkt i tunnan. Ett barn som inte
  rör något ser tunnan fyllas och rundan klaras — agensen är helt valfri.
- **Skyffeln "teleport-griper".** Drar man skyffeln inom `PICK_R`=70 av en hög *hoppar* högen
  till skyffeln och fäster — ingen känsla av att lyfta/balansera, ingen vikt. Och depositen är
  ett villkorslöst "inom DROP.r=120 → ramlar i". Det funkar, men är en avstånds-snäpp, inte
  en handling med tyngd.
- **Tunnan är en passiv låda.** Den `pop`:ar när man matar den och vickar vid vinst, men
  reagerar annars inte (öppnar inget lock, säger inget, fylls inte synligt inuti). Mål-ringen
  är en statisk cirkel.
- **Valpen gör inget eget mellan tap.** Den står still tills man trycker (eller auto-vandrar);
  den nosar inte, jagar inte fjäril, tittar inte på bajset. Svansvift + bob är fina men loopen
  är "tryck → gå → kanske bajs".
- **Flugorna är ren dekor.** De surrar och puffar bort vid upphämtning — kul! — men gör inget
  med spelet (ingen "skynda dig"-mjuk signal, ingen extra glädje när man hinner före).
- **Ljud-effekter är delvis röst-/emoji-uttalade.** "Hihi!" och 💨/💩 är *flytande text/emoji*
  och röst, inte riktiga klipp; plopp/whoosh/correct är syntblippar. Ingen valp-gläfs, inget
  riktigt "plask/plopp" i tunnan, ingen surr-loop för flugorna.
- **Vinst = delad konfetti** + valp-skutt. Charmigt, men finishen är inte park-specifik
  (ingen "ren park!"-uppljusning, ingen Lova som tackar, ingen blomma som spirar där bajset låg).

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Knyt bajset till barnets handling.** Låt valpen **alltid** lämna en hög där den
  stannar (ta bort slumpen, behåll cooldown) — då blir "tryck dit → valpen bajsar där" en
  tydlig, repeterbar orsak-verkan som 2-åringar älskar. Auto-vandring blir reserv, inte motor.
- **[Medium] Låt hjälpen bjuda in.** Behåll hint-strecket, men gör auto-skyffeln till sista
  utväg (fler idle-cykler / bara om verkligen inget händer) så ett aktivt barn alltid gör
  jobbet självt.
- **[Quick] Ge skyffeln vikt.** Liten fördröjning/studs när högen lyfts, en aning "tyngd"
  (skyffeln sjunker lite) — gör lyftet till en handling, inte en teleport-snäpp.

### Variation & överraskning
- **[Quick] Variera bajs & fynd.** Olika högstorlekar, ibland en hög som gömmer en 🦴/⭐ som
  flyger upp vid upphämtning — en liten "en till!"-morot.
- **[Medium] Valpen gör roliga saker.** Nosar i marken, jagar en fjäril, sätter sig och kliar
  — småliv mellan tap som gör henne till en kompis, inte en markör.

### Juice
- **[Quick] Tunnan lever.** Lock som öppnas när skyffeln närmar sig, ett "glufs"/plask när
  bajset ramlar i, och en synlig fyllnad inuti (eller tunnan blir gladare för varje hög).
- **[Quick] Surr som signal.** Låt flug-surret bli lite mer enträget ju längre högen ligger,
  och en extra liten glädje-puff + "skönt!" när man tar en flug-omsvärmad hög.
- **[Quick] Skyffel-skrap/plask-feedback** vid upptag och nedsläpp.

### Progression
- **[Medium] "Ren park"-känsla.** För varje hög som städas: en liten blomma/grön fläck spirar
  där den låg, så planen blir synligt finare över rundan — konkret progress utöver mätaren.

### Karaktär & berättelse
- **[Deep] Lova i scenen.** Lova (enda namngivna människan) väntar vid grinden, hejar när en
  hög städas och kramar valpen vid vinst — en mottagare/publik istället för generisk konfetti.
- **[Quick] Park-specifik finish:** fåglar flyger upp, blommorna öppnar sig, "Parken är ren!"
  med valpen som rullar runt av glädje.

### Ljud
- **[Quick] Riktiga klipp** ([[real-audio-sfx]]): valp-gläfs/flås, mjukt "plopp", plask i
  tunnan, flug-surr-loop — ersätt röst-/emoji-uttalade "Hihi!"/💨. Hund-sample finns i andra spel.
- **[Quick] Lugn park-ambient** (fågelkvitter) + varierat vinst-sting.

## 5. Status / loggar

- 2026-06-30: Doc skriven (ersätter den gamla bygg-specen; granskad mot grundnings-fixen och
  playtest som bekräftar rätt skalad gräsyta). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] alltid-bajs-där-valpen-stannar + [Quick] levande tunna
  + [Quick] valp-gläfs** — gör kärn-orsak-verkan tydlig och finishen mysig.
