# Nätskott på stan (`natskott-pa-stan`)

> fysik · tap · 2–5 · ✅ marknadskvalitet
> Status: ✅ — byggd 2026-08-08 efter spec-ja 2026-08-07, godkänd av spelkritiker efter åtgärder

## 0. Spec (ur `docs/IDEER.md` §3 — alla beslut tagna av ägaren 2026-08-07)

| | |
|---|---|
| **id** | `natskott-pa-stan` |
| **titleSv** | Nätskott på stan |
| **icon** | 🚙 (verifierad unik — biltvätten har 🚗) |
| **kategori** | fysik → flik Fysik |
| **input** | tap (+ stor växelknapp; inga drag alls) |
| **ålder** | [2, 5] |
| **kärnloop** | bilen rullar (parallax stad→förort); tryck var som helst → nät skjuts dit från Spindel-Zackes arm med whoosh + rekyl <100 ms; klibbnät fäster målet där det är, dragnät drar hem det till baksätet |
| **mål** | uppdragsrundor som roterar ("fånga katten" · "fäst paketen" · "hämta 3 ballonger"); rund-final = hemkomsten → progress.complete() |
| **agens** | VAR man skjuter (tap) × VILKET nät (växelknappen) — båda näten gör alltid något roligt på varje mål, inget felval |
| **variation** | kuliss skiftar stad→förort; målpool roterar; sällsynt wow ~1 på 8: guldpaket som regnar stjärnor |
| **mottagare** | baksätet — hemdragna djur/saker landar där och jublar; monster som vinkar ur krossade rutor |
| **finish** | hemkomsten: bilen stannar vid huset, alla insamlade hoppar ur och firar. Klistermärke |

**Fasta ägarbeslut (P0-ram):**
1. Armen/dräkten är **Spindel-Zackes** (röd/blå, svarta nätlinjer — egen design, inte Marvel).
2. **Fönster krossas på riktigt** — tecknat glitter-splitter + glatt "hoppsan"-ljud, rutan
   **självlagas med skimmer efter ~5 s** (världen förblir aldrig trasig = tak), ibland tittar
   ett litet monster ut ur hålet och vinkar.
3. **Inga människor** — mål är djur, monster, föremål (katter, hundar, fåglar, paket,
   blomkrukor, ballonger).
4. Uppdragsrundor som använder **båda** näten; fri lek mellan uppdragen; aldrig fail.
5. Nätval via **stor växelknapp** (≥96 px) med egna ritade ikoner.
6. Bilen är en **antydd ram** — smal dörrkant/fönsterkarm nertill där armen vilar.
7. Fysik: **matter.js** (`PhysicsWorld`); kroppar följer scrollen, städas utanför bild.
   Klibbnät = kroppen statisk i bakgrundslagret (scrollar med). Dragnät = constraint mot
   kameran; kroppen plockas ur fysiken nära bilen → landar i baksätet.
8. **Motgång med tak:** vindby (max 2 lösa samtidigt) + skata som knycker paket (1 åt gången,
   går att näta).

**Röstrepliker (8 literaler)**
```
"Tryck där du vill skjuta nätet!"          (intro vid mount)
"Byt nät med den stora knappen!"           (om-cue / när man aldrig bytt)
"Fånga katten med dragnätet!"              (uppdrag)
"Fäst paketen så de inte blåser iväg!"     (uppdrag)
"Hämta hem tre ballonger!"                 (uppdrag — tillagd vid bygget: beslut 4
                                            kräver replik per uppdrag, ballongen
                                            saknade en i 7-listan)
"Hoppsan! Där rök en ruta!"                (fönsterkross, ibland)
"Titta, baksätet blir fullt med vänner!"   (delmål)
"Nu är vi hemma — vilket äventyr!"         (finish)
```

## 1. Nuläge (sett som spelare)

Bibliotekets första förstapersonsspel: du sitter i bilen (antydd röd dörrkant nertill),
Spindel-Zackes arm i webb-skjutar-pose guppar nere i bild, och staden rullar förbi i tre
parallaxdjup som gradvis blir förort. Tap var som helst → nät skjuts dit (thwip + rekyl +
ripple i samma frame). Stor växelknapp (byter färg per läge): **klibbnät** (grönt) fäster
målet där det är med nät-overlay; **dragnät** (blått) drar hem det synligt genom luften —
accelererar, bromsar, arkar ner i baksätet där det blir ett guppande huvud och hela sätet
gör en hoppvåg. Mål: katt, hund, fågel (sprattlar loss ur klibbnät efter 2,3 s — för pigg!),
paket, blomkruka i fönsterbleck, ballong, monster. Fönster krossas i glitter-splitter (max 2,
självlagas ~5 s, ibland vinkar ett monster ur hålet). Uppdragspanel ikon-först (ritad
katt/paket/ballong + nätikon + plupp-räknare). Motgång: vindby (streck förankrade vid
paketen, lossning när strecket når fram, max 2 lösa) + skata (1 åt gången, nätas ner).
Guldpaket ~1/8 regnar stjärnor. Efter 3 uppdrag: hemkomsten — parallaxen bromsar över 1,9 s,
gatan töms (pågående hemdrag får landa), hemmets hus glider fram, alla insamlade hoppar ur
sätet en och en med tonstege och firar framför huset; `complete()` efter spelets egen replik.
(Skärmdumpar: `.test-shots/natskott-pa-stan.png` · `natskott-uppdrag.png` · `natskott-hemkomst.png`.)

## 2. Ursprunglig plan & tankeprocess

Första förstapersonsspelet i biblioteket (alla 71 övriga är sidovy/ovanifrån) — resa-känsla
från bilfönstret. Ett enda gest-verb (tap där du vill) men två utfall via lägesknappen ger
äkta agens utan mer motorik. Skiljer sig från de tre spindelspelen: `spindelhjalten` drar
hjälten, `spindel-zacke-svingar` är pendel-timing, `spindelnatet` fångar fallande — här rör
sig världen och nätet påverkar VÄRLDEN. Rullande bakgrund ger variation/progression utan
fail-nivåer. Uppdragen tvingar fram båda näten så växelknappen inte blir dekor.

## 3. Vad gör det lättjefullt / tunt

Kritikerns kvarstående anmärkningar efter åtgärdsrundan (inga blockerare):

- **Handens pose** läser mer som V-tecken än pekfinger+lillfinger-webbpose i denna skala
  (ren smaksak, ingen funktionsbrist).
- **Dubbel uppdragskredit möjlig:** ett paket som blåser loss och klibbas igen räknas två
  gånger (`!rec.stuck`-villkoret) — gör uppdraget lättare, aldrig svårare; inget P0-brott.
- Mottagar-scenen tål mer: paraden är fin men huset självt reagerar inte (inga tända fönster,
  ingen som öppnar dörren).

## 4. Förbättringar & förhöjningar (plan)

- **[Quick] Hand-posen:** vinkla mellanfingrarna in tydligare så webb-posen läses.
- **[Quick] Hemkomst-huset lever:** dörren öppnas / fönster tänds när paraden står klar.
- **[Medium] Fler kulisser:** natt-läge med lysande fönster, regnväder med paraplyer.
- **[Medium] Fler uppdragstyper:** "hitta guldpaketet" · "näta ner skatan innan hon knycker".
- **[Quick] Dubbelkrediten:** kreditera bara första klibbningen per paket (flagga per rec).

## 5. Status / loggar

- 2026-08-07: Spec-ja från ägaren. Doc skriven, bygge startat (`/spel`-körning).
- 2026-08-08 ✅ **Byggd och godkänd.** `spelbyggare` byggde hela modulen (~1900 rader,
  matter.js + tre parallaxdjup + två nätlägen + uppdragsrotation + hemkomstparad).
  `spelkritiker` verifierade alla 7 grindpunkter live (dragnätet mätt genom fem skärmdumpar —
  ingen teleport; taken bekräftade genom hookade `_gust`/`_spawnSkata`) och fann en blockerare:
  0 av 8 röstklipp inspelade → `npm run voice` körde (8 klipp). Åtgärdat ur kritiken: gatan
  töms vid hemkomst (strövare stod bredvid paradfigurerna), vindby-strecken förankras vid
  paketen + lossning när strecket når fram (orsak → verkan), sondens döda `seen.gust`-fält
  mäter nu spelets `loosened`-flagga, docens replik-lista kompletterad till 8. Sond
  `scripts/_natprobe.mjs`: full runda 40–43 s, exit mitt i finalen + återinträde, 0 konsolfel;
  `_idleprobe` 0 självframsteg. `npm run check` 0/0.
