# Sortera Skräp (`sortera-skrap`)
> 🧩 pussel · drag · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En solig äng. Högst upp ligger en prydlig hög med skräp på gräddvita "brickor" (📄📰🍌🍞🥤
🥫…), nedanför står 2–4 färgkodade tunnor med stor ikon i mitten (📄 papper / 🍎 mat / 🧴 plast
/ 🥫 glas&metall) — ingen läsning krävs. Jag tar en sak; den lyfts och skuggan växer (känns
högre). Drar jag den till rätt tunna → locket poppar, en mörk "mun" gapar, gnistor + ring +
"pling", och saken ploppar ner *bakom* tunnan. Fel tunna → mjuk studs hem + vänlig vingel +
mjukt ljud (aldrig en bestraffning). Töms högen → gnist-svep över tunnorna, delat firande
(stjärna + klistermärke) + mjuk skakning, och en ny, lite större runda byggs (fler tunnor,
fler saker). Varje runda varierar exakt vilka föremål som dyker upp (round-robin över
kategorierna). Idle ~6s → instruktionen upprepas och ett föremål "andas" + en ring pulsar
över rätt tunna.

**Funkar bra:** lyft-juicen och plopp-ner-bakom-tunnan känns konkret och belönande, tunnorna
är tydliga och inbjudande (skugga, panel, ljusstripe, mun), färgkodning + ikon gör mål utan
läsning, no-fail intakt, nivå-tillväxt 2→4 tunnor och varierad hög ger djup. Exit-säkert och
prydligt.

*(Skärmdump: äng, banan/tidning/bröd-bricka i toppen, blå pappers- + grön mat-tunna.)*

## 2. Ursprunglig plan & tankeprocess

Kodens intent: en *marknadsmässig* sorteringslek som behåller den enkla "dra varje sak till
rätt tunna"-mekaniken men lyfter känslan — levande scen, charmiga föremål som växer vid grepp,
saftig rätt-släpp-juice (popp + gnistor + ring + lock-studs + plopp), och en mjuk, växande
progression (2 tunnor/få saker → 4 tunnor/fler saker) med varierad hög varje runda. Det
pedagogiska fröet är kategorisering (papper/mat/plast/glas&metall) och de två första
kategorierna är medvetet lätta att skilja (papper vs mat). Strikt felfritt.

## 3. Vad gör det lättjefullt / tunt

- **Tunnorna är möbler, inte varelser.** De har en "mun" men inget ansikte, ingen blick, ingen
  reaktion utöver lock-popp. Den uttalade berättelsen ("Hjälp *mig* sortera") har inget *mig* —
  ingen sopgubbe, ingen Bobo, ingen återvinningsbil som tar emot och tackar.
- **Föremålen delar chassi.** Varje sak är samma gräddvita skiva + glans + ring med bara en
  annan emoji. Bananen, glasburken och tidningen beter sig identiskt — ingen per-objekt-
  personlighet (glas klirrar inte, papper prasslar inte, banan-skalet viftar inte).
- **En-utfalls-interaktion.** Varje sak har exakt en rätt tunna; "valet" är bara att hitta den.
  Inget händer *olika* beroende på vad jag väljer — samma plopp, samma pling, oavsett material.
- **Inget byggs upp / inget att återkomma till.** Saken försvinner ner bakom tunnan och blir
  inget. Ingen "städad värld"-mätare, ingen hög skräp på marken som krymper, ingen full-tunna
  som behöver tömmas. Belöningen är den generiska konfettin alla spel delar.
- **Ljudpaletten är tunn och materialblind.** 'pling'/'soft'/'celebrate' + TTS-beröm. En glas-
  klang i metalltunnan, ett pappersprassel, en plast-knastring skulle göra varje sortering
  *kännbar* — och förstärka kategorin multisensoriskt.
- **Högen ser genererad ut.** Den prydliga 1–2-radersgriden (layoutItems) avslöjar att det är
  en layout-funktion, inte en lekfull, slängd skräphög.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Tunnorna blir glada varelser.** Ge varje tunna ögon ovanför munnen som följer den
  sak man håller, gapar när den närmar sig och *tuggar/rapar* belåtet vid rätt material (lånar
  mönstret från `mata-monstret`). Då blir varje släpp ett möte, inte en inlämning — och fel
  tunna kan vänligt skaka på huvudet ("inte min sort!") utan bestraffning.
- **[Deep] En mottagare/maskot.** Bobo som sopgubbe (eller en liten återvinningsbil) som rullar
  in, tar emot full hög och *tackar* med en egen vinst-animation istället för generisk konfetti.

### Variation & överraskning
- **[Medium] Per-material-reaktion.** Glas klirrar och glittrar, papper prasslar och far ner som
  ett blad, plast studsar lätt, matrester får en liten fluga 🪰 som surrar bort. Samma mekanik,
  men varje sort *känns* som sin sort.
- ~~**[Quick] Lekfullare hög.**~~ ✅ **REDAN BYGGD 2026-07-02** (`layoutItems` jitterar x/y,
  `_makeItem` lutar varje sak ±0,22 rad) — punkten stod kvar som öppen i §4 fast §5 loggade
  den. Struken 2026-08-12.
- **[Quick] Sällsynt guld-skräp.** Då och då en glittrande sak som ger extra gnistregn när den
  hamnar rätt — ett litet "wow" som driver "en till!".

### Juice
- ~~**[Quick] Materialspecifik SFX**~~ ✅ **REDAN BYGGD 2026-07-02** (`_materialSound`:
  glasklang, pappersprassel, plast-boing, mjuk duns + lock-"klonk"), syntetiserad via
  `audio.tone`. *Kvar:* riktiga klipp ([[real-audio-sfx]]) — blockerat, MOSS är nere.
- ~~**[Quick] Full-tunna-känsla.**~~ ✅ 2026-08-12 (v1.164.0) — **den här omgången.** Saken
  försvann tidigare bakom tunnan och lämnade **inget spår**: en tunna såg likadan ut efter
  tio saker som före den första. Nu lägger varje svald sak en klump i tunnans hals — i
  **sakens egen färg** — och lasten **trycker upp locket** (8 px per sak, tak vid 6 = 48 px).
  Tyngden syns i guppet: en nästan tom tunna hoppar till och lugnar sig på **0,3 s**, en full
  går **15,6 px djupt** och tar **0,65 s**, och står **2,6 px lägre** när den lugnat sig. Vid
  rundslut **rapar** varje tunna som ätit (locket lättar 26 px, lasten skakar till, tonen
  glider nedåt). Mätt med `scripts/_tunnprobe.mjs`: **12/12**.

### Progression
- **[Medium] Städad-värld-mätare.** Lägg lite skräp på marken i scenen som krymper när jag
  sorterar; full runda → ängen blir blank/blommar. Ger ett *synligt* mål bortom "töm högen".
- **[Quick] Mjuk scen-progression** (cross-fade mellan scener mellan rundor) så världen känns
  sammanhängande, inte hård-ombyggd.

### Karaktär & berättelse
- **[Deep] Liten värld kring tunnorna** — en park med en bänk, en fågel som hejar, så scenen
  har liv bakom mekaniken (inte bar tapet).

### Ljud
- **[Quick] Variera vinst-stinget** (verifiera att den globala variationen triggas här) + en
  lugn fågel-/vind-ambient i bakgrunden.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Inga kodändringar. Testkörning ren (errorCount 0),
  skärmdump verifierad (äng, två tunnor, varierad hög).
- Rekommenderad första-omgång: **[Medium] tunnor med ögon/tugg + [Quick] materialspecifik SFX +
  [Quick] klustrad hög** — störst upplevd lyft (gör tunnorna till varelser och varje sort
  kännbar) för rimlig insats.
- 2026-07-02: **Första-omgång genomförd** — hela rekommendationen byggd (den avbrutna passagen
  hade bara skrivit om header-kommentaren; ingen kod fanns):
  - **[Medium] Tunnor som GLADA VARELSER** (`_makeBin`): varje tunna har nu stora ögon vars
    **pupiller följer det man håller** (gaze i `_update`), en **mun som GAPAR** när en sak
    närmar sig öppningen och **TUGGAR belåtet** vid rätt släpp (`_chew`), och kategori-ikonen
    sitter som en **mage-bricka** (ingen läsning). Fel sort → tunnan **skakar vänligt på
    huvudet** ("inte min sort!", `_headShake`) — aldrig en bestraffning.
  - **[Quick] Materialspecifik SFX** (`_materialSound`): glas klingar ljust (två pling), papper
    prasslar i korta triangelblip, plast studsar ("boing"), mat dunsar mjukt — allt via
    `audio.tone`, plus ett lock-"klonk". Juice (ring/puff) i materialets egen färg.
  - **[Quick] Klustrad "slängd" hög** (`layoutItems` + föremåls-rotation): jitter i x/y +
    tydligare lutning så högen ser ut som riktigt skräp, inte en prydlig tabell.
  - **Pixi v8-gotcha lagad under vägen:** pupillerna byggdes först som *bara* Graphics
    (`circle(0,0,r)`) med en stor `.position.set(cx, eyeY)` → renderade som ett **helskärmsbrett
    svart streck** (getBounds 2625×28 trots scale 1 i hela kedjan). Fix: linda varje öga i en
    egen container med **bakad mitt** i geometrin (samma mönster som nallen/kompisarna) och
    flytta pupillen med små offset. → se minnet om detta.
  - Test: `errorCount 0` (statisk + drag-test som sorterar i båda tunnorna); skärmdump bekräftar
    två tunn-varelser med följande ögon + mage-brickor och en klustrad hög.
  - **Deferred:** [Deep] mottagar-maskot (Bobo som sopgubbe/återvinningsbil); [Medium] städad-
    värld-mätare (skräp på marken som krymper); [Medium] per-material-partiklar (fluga vid mat,
    blad-fall vid papper); [Quick] sällsynt guld-skräp; [Quick] scen-crossfade + ambient.
- 2026-08-12 (v1.164.0): **[Quick] Full-tunna-känsla byggd** (nattköns N10, pass 5).
  - **Lasten syns.** `_fillBin` lägger en klump per svald sak i tunnans hals, i **sakens egen
    färg** (`TRASH_ART`), och höjer lockets vilo-höjd 8 px per sak med tak vid 6 (48 px). Serien
    mätt i scengrafen, inte i flaggan: lock-vila −122 → −170 px, klumpar 0 → 6, sjunde saken
    lägger **0** (taket håller).
  - **Tyngden.** `_settleBin`: guppet blir djupare och sättningen längre med lasten — **5,9 px /
    0,32 s** nästan tom mot **15,6 px / 0,65 s** full — tunnan står **2,6 px lägre**, skuggan
    breddas 12 % och `pop` skalas ner (en full tunna orkar inte hoppa).
  - **Rapen.** Vid rundslut rapar varje tunna som ätit: locket lättar 26 px och landar **0,0 px**
    från lastens nya vilo-höjd, lasten skakar till, tonen glider 190 → 78 Hz.
  - **Två fel som bara BILDEN hittade** (båda gröna i alla tal):
    1. **Himlen syntes mellan locket och högen.** Klumparna täcker bara mitten, så en tunna med
       upplyft lock såg **trasig** ut, inte full. En **hals** (solid massa i tunnans egen ton)
       växer nu med lasten så locket vilar på något.
    2. **Halsen i lockets ton smälte ihop med locket** till en hög hatt. Den är nu 0,40 mot
       svart (tunnans insida i skugga) och slutar precis under lockets underkant, så de
       översta klumparna sticker upp ur den.
  - **Sondens egen fälla, mätt:** isoleringen dolde först bara *inuti* tunnan och mätte då
    fortfarande skalets bakknapp — **16 320 px i BÅDA armarna**, alltså ett grönt tal även på
    HEAD där lasten inte fanns. Isoleringen går nu hela vägen till roten (≈3 900 px lasten
    ensam, 15 800 med halsen). HEAD-armen: **6 av 8 röda**.
  - Kontroll: `npm run check` 0 fel · `npm run test sortera-skrap` grön · `_tunnprobe` 12/12 ·
    exit mitt i sättningen utan konsolfel.
  - **Struket i §4 samtidigt** (redan byggt 2026-07-02, men aldrig struket): *Lekfullare hög*
    och *Materialspecifik SFX* (klipp-halvan kvar, MOSS nere).
