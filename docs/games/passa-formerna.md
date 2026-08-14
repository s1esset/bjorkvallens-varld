# Passa Formerna (`passa-formerna`)

> pussel · drag · 2–5 år · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `passa-formerna` |
| **titleSv** | Passa Formerna |
| **icon** | 🔺 |
| **kategori** | pussel → flik **Pussel** |
| **input** | drag |
| **ålder** | [2, 5] |
| **kärnloop** | Dra en FORMVÄN (fristående ritad figur med ögon, mun, två armar och egen vilo-guppning) till sitt hål i trälådan. Rätt hål → hen dyker ner med ett trä-klonk, locket studsar, hålets kant tänds i vännens färg och nästa ton i C-durskalan klingar. |
| **mål** | Alla formvänner hemma → lådan skakar av skratt, locket lyfter, allihop poppar upp ur mörkret som en kör och sjunger skalan uppifrån → `progress.complete()` (stjärna + klistermärke + konfetti) → ny, större runda. |
| **agens** | Vilket hål barnet väljer. Hålens ordning lottas OBEROENDE av figurernas varje runda, så ingen kan lära sig "stjärnan ligger till höger" — man måste titta på formen. |
| **variation** | 3 → 6 former med nivån · ny färgpalett per runda · sällsynt GYLLENE form som glittrar medan den ligger kvar och sjunger en durtreklang när den passar · musen dyker upp i olika hål. |
| **mottagare** | Bobo (`lib/karaktarer.js`) står vid lådan, följer det som dras med blicken, `heja` per form och `jubel` i finalen. |
| **finish** | Lådans skratt (tre låga toner + skakning) → locket lyfter och avslöjar mörkret innanför → kören poppar upp och sjunger C-durskalan uppifrån. |

**Röstrepliker**
```
"Dra formerna till rätt hål i lådan!"      (intro, mount)
"Vilken form passar i hålet?"              (om-cue vid ~6 s inaktivitet + ny runda)
"Cirkel!" "Triangel!" "Kvadrat!" "Stjärna!" "Hjärta!" "Halvmåne!" "Femhörning!"   (formens namn vid rätt hål)
"Precis rätt!" "Den passade fint!" "Så duktig du är!"                            (beröm vid rätt hål)
"Hoppsan, prova ett annat hål!"            (fel hål, ibland)
"Titta, en liten mus i hålet!"             (motgången)
"En gyllene form! Så fin!"                 (den sällsynta gyllene formen)
"Alla formerna kom hem!"                   (finalen)
```

## 1. Nuläge (sett som spelare)

En äng med en stor trälåda. På lådans front sitter 3–6 hål — riktiga silhuetter i träet med
fasad kant och mörk öppning. Ovanför svävar lika många formvänner: cirkel, triangel, kvadrat,
stjärna, hjärta, halvmåne, femhörning, var och en i sin egen färg med ögon, leende och två
små armar, och var och en guppar i sin EGEN takt (`liv` med slumpad fas).

Trycker man på en vän squashar hon till och pep till. Drar man henne mot lådan GAPAR det
närmaste hålet lite (per bildruta, inga tweens) och Bobo följer henne med blicken. Släpper man
i rätt hål dyker hon ner med ett trä-klonk, locket studsar, sågspån yr, hålets kant tänds i
hennes färg och nästa ton i C-durskalan klingar — en full runda spelar alltså en stigande
skala. Fel hål: hålet skakar och träet säger "tock tock", vännen vinglar och glider hem. Bobo
blir förvånad, aldrig sur.

Ibland tittar en liten mus upp ur ett hål och skymmer det i ~3 s. Släpper man rätt form på
henne piper hon till och kilar ner direkt, så man kan göra om på en sekund.

När alla är hemma skrattar lådan, locket lyfter, och alla formvänner poppar upp ur mörkret,
vinkar med båda armarna och sjunger skalan uppifrån. Sedan konfetti, stjärna, klistermärke —
och en ny runda med fler former och nya färger.

Skärmdumpar från byggpasset (sonden, se §5): `.test-shots/_passa-formerna-brade.png`,
`.test-shots/_passa-formerna-former.png`.

## 2. Ursprunglig plan & tankeprocess

Shape sorter är den klassiska 1–3-årsleksaken, och den bär exakt det P0 vill ha: ett tydligt
mål, noll läsning, ingen tidspress och ett fysiskt "klonk" som belöning. Det pedagogiska målet
är formigenkänning (och formens NAMN, som sägs på svenska när den passar) samt finmotorik i
draget.

Två designbeslut styr resten:

1. **Hål och figur ritas ur SAMMA vägbyggare** (`former.js: formVag`). Silhuetten barnet håller
   i handen och silhuetten i träet är därmed samma form per konstruktion. Ritades de var för
   sig hade de kunnat glida isär tyst.
2. **Formerna är VÄNNER, inte brickor.** P0 ASSETS förbjuder en emoji i en ruta; här har varje
   form ögon, mun, armar och eget liv, och finalen bygger på just det (de vinkar).

## 3. Vad gör det lättjefullt / tunt

- Formvännerna svävar i luften ovanför lådan med en markskugga under sig — det är repots
  vanliga hyllkonvention (`skuggmatchning` gör samma sak), men det finns ingen yta de ligger
  på. En riktig hylla eller en gräsmatta under dem vore ärligare.
- Musen är den enda motgången, och hon gör bara en sak. Ett andra litet hinder (en fjäril som
  sätter sig på en form och måste vinkas bort) skulle ge mer variation utan att höja svårigheten.
- Kören i finalen sjunger skalan men gör ingen koreografi utöver vinkningen.
- Ingen "fel form i rätt hål"-humor: om triangeln trycks mot cirkelhålet händer ingenting
  utöver skakningen. En kort "hon fastnar och puttas ut"-animation vore roligare.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- [Quick] Låt formvännen som släpps i FEL hål fastna en aning i öppningen och puttas ut av
  hålet — motgången får en fysisk orsak i stället för bara en skakning.
- [Medium] Lägg formerna på en ritad hylla/gräskant så de inte svävar.

**Variation**
- [Quick] Andra hindret: en fjäril som sätter sig på en formvän och flyger iväg vid tryck.
- [Medium] Låt lådan byta skepnad mellan rundor (trälåda → målad leksakskista → skattkista).

**Juice**
- [Quick] Kören i finalen: låt varje form hoppa i takt med sin ton i stället för att bara vinka.
- [Quick] Damm/sågspån i lådans skugga när locket smäller igen vid ny runda.

**Progression**
- [Medium] Efter nivå 6: två rader hål (låda med lock uppe och nere) i stället för fler i bredd.

**Karaktär**
- [Quick] Bobo kan peka mot ett hål vid idle-ledtråden i stället för bara ringen.

**Ljud**
- [Quick] Byt trä-klonken mot ett riktigt CC0-träljud om ett sådant importeras (`npm run sfx`).

## 5. Status / loggar

`2026-08-14 · byggd (index.js + former.js) · 7 former, mus-motgång med tak, gyllene form,
kör-final · verifierad med en egen sond innan registrering: formarket (alla 7 former + hål +
mus), hela brädet, finalen, ett RIKTIGT drag från figurens faktiska läge till dess hål
(klara = 1), fel hål (klara = 0), musen som blockerar (blockad = true → släpp → mus borta →
samma drag går igenom), idle-ledtråden, exit mitt i finalen och exit mitt i ett drag — 0
konsolfel i alla lägen. Sonden ligger kvar som src/games/passa-formerna/_formbild.mjs (dev-only,
importeras inte av spelet; ta bort eller flytta till scripts/ vid städning).`

**Fynd som bara bilden hittade** (båda gröna i tal, felaktiga i bild):
- Halvmånens innerbåge ritades MEDURS och gav en klump med ett hack i stället för en måne.
  Bågen måste gå moturs — den del av innercirkeln som ligger inuti yttercirkeln är dess
  vänstra sida.
- Locket öppnades 108 px med 0,07 rad lutning; kören hamnade på samma höjd och hela finalen
  läste som fyra figurer balanserande på en gungbräda. Nu 82 px / 0,032 rad och kören 196 px
  ovanför lådan.
- `createScene('warm')` låg för nära träets egen ton — hela bilden blev EN beige yta. Bytt
  till `meadow` och mörkare trä.
