# Titt ut, pappa! (`titt-ut-pappa`)

> roligt · tap · 2–5 · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

*Spel 1 av 3 i nattpasset 2026-08-16 (v1.225.0, se `docs/SESSIONS.md`). Körplanen
`docs/NATTPASS.md` är struken — passet är kört, och spec-kortet ur `docs/IDEER.md` post 2 ⓵
bor numera här nedan.*

## 0. Spec

| | |
|---|---|
| **id** | `titt-ut-pappa` |
| **titleSv** | Titt ut, pappa! |
| **icon** | 🫣 |
| **kategori** | `roligt` → flik **Roligt** |
| **input** | tap |
| **ålder** | [2, 5] |
| **kärnloop** | 6 gömställen i ett rum. Pappa är i ETT av dem och **skvallrar** (bukt i andningens takt · ögonen över kanten som följer barnets senaste tryck · fniss + synlig skakning). Barnet trycker → pappa upp med min + eget ljud, ELLER en rolig sak som blir en insamlad kompis. |
| **mål** | Fem fynd av pappa (mätaren = fem små ansikten som tänds, noll siffror) → `progress.complete()` |
| **agens** | VILKET gömställe barnet trycker på, läst ur tre olika slags skvaller. Slumpen avgör aldrig ensam: gömstället talar om sig självt hela tiden. |
| **variation** | Pappas gömställe och överraskningspoolen lottas om varje runda; progression i hur mycket det skvallrar; sällsynt wow (~1 på 8): han gömmer sig i **taklampan**. |
| **mottagare** | De insamlade kompisarna — de reagerar när de hittas och **jublar i finalen** tillsammans med pappa. |
| **finish** | Allt barnet hittat far upp ur sina gömställen samtidigt: strumpan vinkar, katten jamar, ballongen far i taket, pappa blinkar. Klistermärke. |

**Röstrepliker (8 literaler)**
```
"Var är pappa? Tryck där du tror att han gömmer sig!"   ← voiceIntro
"Titt ut! Där var han!"
"Oj, en strumpa! Leta vidare."
"Titta vad du hittade! Leta vidare."
"Titta, något rör sig där borta!"                        ← om-cue vid ~6 s inaktivitet
"Hihi, nu gömde han sig igen!"
"Du hittade pappa fem gånger! Vilken mästare du är."
"Titta så många kompisar du hittade!"
```

Spec-kortet i IDEER hade **sju** repliker med `"Oj, en strumpa! Leta vidare."` som ENDA
fyndreplik. Den är sann bara för strumpan — hittar barnet katten säger narratorn fel sak. Den
åttonde (`"Titta vad du hittade! Leta vidare."`) är den generiska; strumpans egen står kvar för
strumpan. Repliken `"Titta, något rör sig där borta …"` skrivs med `!` i stället för `…`, så
klippgenereringen får en hel mening.

## 1. Nuläge (sett som spelare)

Ett barnrum i sidovy: fönster med gardin och ett skåp under, en flyttkartong, en tvättkorg, en
dörr på glänt, en filthög, en alldeles för liten blomkruka — och en taklampa. Pappa är i ett av
dem. Gömstället buktar i andningens takt, ett par ögon kikar upp över kanten och tittar dit
barnet senast tryckte, och med jämna mellanrum hörs ett fniss med en synlig skakning. Ett tryck
ger alltid något: pappa med min och eget ljud, en kompis som poppar upp och flyttar in på raden
längst ner, eller ett dammoln och en mjuk ton om gömstället redan är tömt. Fem fynd → finalen.

Skärmdump: `.test-shots/titt-ut-pappa.png`. Gömställena ett och ett i tre lägen (gömd · kik ·
avslöjad): `.test-shots/gomma/<nyckel>-*.png`, skrivna av `node scripts/_gommaprobe.mjs --spara`.

### Vad sonden mätte (och vad den ändrade)

`scripts/_gommaprobe.mjs` fryser scenen (`gsap.globalTimeline.pause()`) och tar två skärmdumpar
som skiljer sig på **exakt en sak** — ansiktets `visible`. Diffen är då per definition den
synliga delen av ansiktet, och inget annat kan ha rört sig. Kontrollarmen prövar **båda**
riktningarna 220 px från det gömda läget och tar den friaste; den föll två gånger innan den
höll (alltid uppåt → taklampans skydd sitter ovanför; riktning ur `kantY > ansY` → krukan står
med flit ovanför sin egen kant).

| gömställe | fritt (kontroll) | gömd | kik | avslöjad |
|---|---|---|---|---|
| gardin | 18 147 | **0** | 13 435 | 33 560 |
| kartong | 24 358 | **0** | 16 472 | 33 042 |
| tvattkorg | 24 233 | **0** | 16 513 | 31 395 |
| dorr | 23 175 | **0** | 16 337 | 28 386 |
| filt | 28 405 | **300** | 22 954 | 34 586 |
| kruka | 35 751 | *25 696 (skämtet)* | — | 32 419 |
| lampa | 13 104 | **0** | — | 26 227 |

**Tre fel som bara mätningen och bilden hittade:**

1. **Ett gemensamt `_framL` gjorde runda 3 osynlig.** Alla gömställens fram-delar låg över
   ansiktet samtidigt, så fönsterskåpet (x 85–365, y 284–570) skar rakt genom pappa när han
   stod i blomkrukan nedanför. Kiken gjorde honom **1 272 px MINDRE** synlig i stället för mer,
   och avslöjandet visade **6 639 px mot 28 000–33 000** för de andra sex. Varje gömställe har
   nu ett eget fram-lager och ansiktslagret skjuts in under just det han gömmer sig i
   (`FRAM_DJUP` + `_satZDjup`). Fixen lyfte även tvättkorgens avslöjande, 14 290 → 31 395.
2. **Krukans skämt läste som ett avskuret huvud ur golvet.** `ansY = -40` lade hakan 66 px
   under bildkanten. Nu −116, och **växtens blad flyttade till fram-delen** — de låg bakom
   ansiktet, som svalde dem helt, så kvar blev en naken kruka mitt i ansiktet.
3. **Mätaren lästes som gardinringar.** Fem släckta ringar på gardinstången uppe till vänster.
   Flyttad till egen panel på den tomma tapetytan höger om taklampan.

## 2. Ursprunglig plan & tankeprocess

Spelet finns för att `lib/ansikte.js` har **fem byggda och betalda funktioner som står stilla**
(se IDEER post 2). Det här spelet gör `blick()` + minerna till kärnmekanik: ögonen över kanten
tittar **dit barnet senast tryckte**, och det är den enda funktion i riggen som kan bära en
titt-ut-lek.

**Det här är inte en gissningslek.** Skillnaden mellan en gissning och ett val är att gömstället
skvallrar, och att skvallret går att LÄSA utan en bokstav:

| Skvaller | Vad det är | Vem läser det |
|---|---|---|
| bukten | gömstället buktar i **andningens takt** — samma klocka som pappas lunga | 2-åringen (något rör sig) |
| ögonen | ett par ögon över kanten i en halv sekund, som **tittar mot barnets senaste tryck** | 3-åringen |
| fnisset | `pappa_fniss` + en synlig skakning i just det möblet | alla |

**"Fel" gömställe är en belöning** (P0 MOTGÅNG): där bor en strumpa, katten, ankan, en ballong,
en välling-tetra eller nallen. Var sak har egen reaktion + eget ljud och **följer med till
finalen** — varje "miss" blir en insamlad kompis. Det är billigare i kod än en felhantering och
roligare än att ha rätt.

### Layout och lagerordning (den bär hela illusionen)

Pappa är **aldrig maskad genom att `view` flyttas** — träffytor och blickmätning läser den noden.
I stället har varje gömställe en **`bak`- och en `fram`-del**, och ansiktet ligger i ett lager
mellan dem: möbeln skymmer honom av sig själv. En titt över kanten är då bara en tween uppåt.

```
_rumL     rummet: vägg, golv, list, fönster, taklampa      (eventMode none)
_bakL     gömställenas BAK-delar (korgens insida, dörrspringan)
_pappaL   ansiktsriggen — flyttas mellan gömställen
_kompisL  överraskningarna som poppar upp
_framL    gömställenas FRAM-delar (korgens framsida, gardinen, lådans flikar)
_hyllL    de insamlade kompisarna längst ner + mätarens fem ansikten
_klickL   träffytorna (≥96 px + 24 px halo), överst så inget kan svälja en pekning
```

## 3. Vad gör det lättjefullt / tunt

*(fylls i av `spelkritiker` efter bygget)*

## 4. Förbättringar & förhöjningar (plan)

**Juice**
- **[Quick] Taklampan dominerar bilden.** Den måste vara ~330 px hög för att kunna dölja ett
  300 px ansikte (`ansY >= kantY + 152`), och blir därmed rummets största föremål trots att
  den bara bär pappa i ~1 fall av 8. Alternativ: en rund rislampa läser som en lampa även i
  den storleken, eller så tappar lampan sin roll som gömställe och wow-läget flyttar
  någon annanstans. **Ägarens öga avgör** — det är en smakfråga, inte ett fel.

**Kärnloop**
- **[Quick] Taklampan och krukan skvallrar inte med ögonen.** Kiken är en tween UPPÅT förbi
  möbelns kant, och de två har ingen kant att titta över: lampans skydd sitter *ovanför*
  ansiktet (en nedåtkik exponerar hela nedre 2/3 av ansiktet, inte ett par ögon), och krukan
  visar honom redan till 3/4. Båda skvallrar med bukt, skakning och fniss i stället. Uppmätt
  och medvetet undantagna i `_gommaprobe.mjs` — men en egen skvallergest för dem (skärmen som
  gungar, bladen som prasslar) vore rikare.

## 5. Status / loggar

`2026-08-15 · doc skriven, spec flyttad hit ur IDEER post 2 · (bygget följer)`
