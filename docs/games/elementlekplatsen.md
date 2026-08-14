# Elementlekplatsen (`elementlekplatsen`)

> fysik · mixed · 3–5 · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec

| | |
|---|---|
| **id** | `elementlekplatsen` |
| **titleSv** | Elementlekplatsen |
| **icon** | 🌪️ |
| **kategori** | fysik → flik Fysik |
| **input** | mixed (tap på verktyg, drag i lådan) |
| **ålder** | [3, 5] |
| **kärnloop** | Välj ett av fem fristående element (eld · vatten · is · vind · jord) och måla med fingret i sandlådan. Materialet faller, rinner, brinner, fryser — och reagerar med det som redan ligger där. |
| **mål** | Sex reaktioner att upptäcka; varje ny tänder en ruta i upptäcktsbandet högst upp. Alla sex → regnbåge över lådan, de fem elementen gör en runda i rutan, `progress.complete()`. Sandlådan fortsätter för alltid — ingenting låses. |
| **agens** | Total. Vilket element, var, hur mycket, i vilken ordning. Allt utfall är automatens, inget är skriptat. |
| **variation** | Fyra startvärldar som rullar ett steg per omgång (sjö · kulle · brasa · istappar), lagrade i `progress.custom.varld`. Sällsynt frö i kullen som gror till en blomma om det hamnar i lera. |
| **mottagare** | Bobo står vid lådans högra kant (`lib/karaktarer.js`-rigg), jublar och sätter ord på varje reaktion. |
| **finish** | Sex regnbågsbågar studsar in över lådan och de fem elementfigurerna flyger en båge tvärs över rutan med gnistspår, en i taget, var och en med sin egen ton. |

**Röstrepliker**

```
"Välj ett element och måla i lådan!"        (intro)
"Ånga! Titta så den stiger!"                (upptäckt: eld + vatten)
"Isen smälte till vatten!"                  (upptäckt: eld + is)
"Vatten och jord blev lera!"                (upptäckt: vatten + jord)
"Jorden blev glödande stenar!"              (upptäckt: eld + jord)
"Isen växer och växer!"                     (upptäckt: is + vatten)
"Vinden blåser iväg allting!"               (upptäckt: vind)
"Titta, en blomma växte i leran!"           (frö gror)
"Du hittade allihop! Nu kommer regnbågen!"  (final)
"Prova eld i vattnet!"                      (om-cue)
"Prova eld på isen!"                        (om-cue)
"Häll vatten på jorden!"                    (om-cue)
"Prova eld på jorden!"                      (om-cue)
"Häll vatten bredvid isen!"                 (om-cue)
"Prova vinden i lådan!"                     (om-cue)
"Måla vad du vill i lådan!"                 (om-cue när allt är hittat)
```

## 1. Nuläge (sett som spelare)

En trälåda med glasruta står mitt på skärmen (x 156–1084, y 120–536). Under den står fem
element som riktiga föremål: en låga, en droppe, en iskristall, en vindvirvel och en
jordkoka — var och en med skugga och egen guppning, det valda lyft och ringat. Ovanför
lådan ligger sex tomma rutor i ett upptäcktsband.

Fingret i lådan målar. Jorden rasar ner i en hög med rätt rasvinkel, vattnet rinner ut och
letar sig ner, isen står still där man satt den, elden brinner ut på en sekund, vinden
knuffar allt löst åt sidan och eroderar högar uppifrån. Möts två material händer något:
ånga stiger och försvinner, is blir vatten, jord blir lera, jord blir glöd som svalnar
till sten, vatten fryser långsamt till mer is. Varje ny reaktion tänder en ruta, Bobo
jublar och säger vad det var.

Skärmdumpar: `.test-shots/_element.png` (eld i sjön), `_element-final.png` (finalen),
`_element-sjo/kulle/brasa/istappar.png` (startvärldarna).

## 2. Ursprunglig plan & tankeprocess

Ägarens spec (spelkö post 7): en sandlåda med fem element, sex upptäckbara reaktioner och
ett upptäcktsband. Poängen är ren orsak-och-verkan-lek: barnet gör något, världen svarar,
ingenting kan gå fel. Det finns inget "rätt" drag och därför heller ingen möjlighet att
misslyckas — bara saker att prova.

**Motorvalet är mätt, inte tyckt.** Husets SPH-vätska (`lib/vatska.js`) övervägdes för
vattnet och valdes bort: alla sex reaktionerna är tillståndsbyten hos en GRANNE, och
grannar finns bara i ett rutnät. `FluidWorld` känner inte till andra material än sitt eget,
och två fasta tidssteg som driver samma bild bryter mot regeln "ett spel = en motor" i
skill fysik-spel. Alltså en enda cellautomat för allt (`automat.js`, ren JS utan Pixi).

Rutnätet blev **58 × 26 celler à 16 px** i stället för specens ~64 × 36 à 20 px. Skälet är
P0, inte prestanda: hemknappens träffyta går till x 140 / y 134 och högtalarens börjar på
x 1140, verktygsraden behöver 168 px mellan centrumen och bandet 68 px höjd. Det som blir
kvar åt lådan är 928 × 416 px, och 16 px-celler ger fler celler i den ytan än 20 px skulle.

## 3. Vad gör det lättjefullt / tunt

Ärlig kritik av nuläget:

- **Elden brinner ut utan bränsle.** Det är en medveten begränsning (annars blir det en
  brandsimulator), men det gör "brasa"-startvärlden till en kort stämning: efter ~6 s är
  glödbädden sten. Ett vedträ-material som brinner långsamt hade gett elden något att göra.
- **Penseln är samma storlek för alla element.** En eldgnista och en jordskopa borde inte
  vara lika stora.
- **Upptäckterna nollställs per omgång.** Det är avsiktligt (bandet är rundans mål, inte ett
  register), men en permanent "elementbok" över alla reaktioner barnet någonsin hittat vore
  en mjukare progression än en nolla vid varje start.
- **Ingen sten-i-hand.** Sten och is är statiska och kan inte plockas bort igen annat än
  genom att målas över. En "sudd"-funktion prövades inte.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- [Medium] Bränsle-material (ved/torv) som brinner långsamt och sprider elden — ger elden
  ett eget beteende i stället för bara en livstid.
- [Quick] Penselstorlek per element (eld liten, jord stor).

**Variation**
- [Medium] Fler startvärldar: en grotta med istappar i taket, en lerbädd med tre frön.
- [Quick] Fler sällsyntheter i klass med fröet (en glödmask som gräver, en isfjäril).

**Juice**
- [Quick] Ångan borde puffa när den når lådans tak i stället för att bara försvinna.
- [Medium] Ljud per material när det landar (`impactAudio`-tanken, fast för celler).

**Progression**
- [Medium] Permanent elementbok i `progress.custom` som minns allt barnet hittat, vid
  sidan av rundans band.

**Karaktär**
- [Quick] Bobo borde titta på det som brinner/rinner, inte bara på fingret.

**Ljud**
- [Quick] Vattenslinga (porl) medan mycket vatten rör sig, som eldslingan.

## 5. Status / loggar

`2026-08-14 · byggd (automat + spel + sond `scripts/_elementprobe.mjs`) · <commit>`

Mätningar vid bygget (`node scripts/_elementprobe.mjs`):

- **Arm 1, automaten utan webbläsare, 60 steg:** kontrollarmarna (jord+sten, is+sten) ger
  0 händelser i alla fem kanalerna. Mätarmarna ger exakt sin egen: eld+vatten 19 ånga ·
  eld+is 9 smält (+8 ånga när smältvattnet möter kvarvarande eld) · vatten+jord 9 lera ·
  eld+jord 22 glöd · is+vatten 5 is.
- **Tak:** eld stannar på 300/300 och glöd på 260/260 efter 400 målade klickar av varje.
- **Vind:** jord (löst) flyttade 7,88 celler, is (fast) 0,00.
- **Arm 2, spelet i headless Chrome:** varje par tänder sin ruta och bara sin; båda
  kontrollarmarna (jord+jord, is+jord) tänder ingen.
- **Kostnad:** 57,1 FPS med hela rutnätet fyllt + eld mot 57,3 FPS med tom ruta, CPU 6×
  strypt. Automaten + omritningen kostar alltså ~0,2 FPS på en strypt maskin.
- **Startvärldarna:** 4 s helt utan input → 0 tända rutor i alla fyra (`_idleprobe`-kravet).
- **Exit mitt i en reaktion:** 0 konsolfel.
