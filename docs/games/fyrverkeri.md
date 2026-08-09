# Fyrverkeri (`fyrverkeri`)
> 🎉 roligt · drag · 2–5 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

En vacker natthimmel (mörkblå→indigo-gradient) med tindrande stjärnor. Uppe i skyn lyser
några tomma stjärnringar (✨ i en svag ring) — målen. Längst ner sitter en söt liten raket
på en ramp. Jag GREPPAR raketen och drar ÅT DET HÅLL den ska flyga (direkt sikte, inte
slangbella) — en prickad bana följer fingret i samma riktning och raketen lutar mot
skjutriktningen, draglängden = kraft. Jag släpper → raketen bågar uppåt under gravitation
(och mild vind på högre nivåer, visad med flagga + drivande pilar), lämnar en glödsvans, och
SMÄLLER vid en stjärna så den tänds till ett lysande ⭐ med starkt sken + "pling" + ett
uppflytande stjärn-emoji. Smällen är 18–30 additivt blandade gnistor som bågar nedåt och
tonar ut. Tänd ALLA stjärnor → stort final-firande (bigCelebration + en salva av sju
fyrverkerier över skyn) + nästa nivå (fler/högre stjärnor, lite vind).

INGET misslyckande: varje skott smäller alltid vackert (vid stjärnan, annars i banans topp),
missar får glada ord, och efter tre missar tar ett auto-sikte över och GARANTERAR en tändning
(det löser en bana mot närmaste otända stjärna). Mätaren går bara uppåt. Tap på tom himmel ger
ett litet glitter. Idle ~6s → röst-recue + raketen poppar.

**Funkar bra:** sikte-mekaniken med den kalibrerade prickbanan är riktigt bra och pedagogisk,
fysiken (gravitation + vind) känns ärlig, smällarna är snygga med additivt sken, och no-fail-
hjälpen (auto-assist + topp-smäll) är osynligt vänlig. Ett av de mer "riktiga spel"-igaste i
samlingen — ett genuint sikta-och-skjut-mål paketerat utan press.

*(Skärmdump: natthimmel, två otända stjärnringar, raket på ramp längst ner, vindflagga uppe.)*

## 2. Ursprunglig plan & tankeprocess

Kodens header beskriver en medveten uppgradering: från en ren "tryck → fyrverkeri"-leksak till
ett RIKTIGT mål-spel med sikte, kraft och en garanterad-rolig miss-hantering. Designen följer
fysik-toolkit-mönstret (AimLauncher + predictTrajectory) och lägger stor vikt vid att prick-
banan matchar den verkliga flygningen exakt (`previewGravity = GY`, fast 1/60-steg) så siktet
är ärligt. Vinden från nivå 2 ger djup utan svårighet; auto-assist + topp-smäll garanterar
no-fail. Tanken: lär ut "sikta och släpp" tryggt, alltid med ett vackert resultat.

## 3. Vad gör det lättjefullt / tunt

Mekaniskt starkt, men *upplevelsen* av fyrverkeri är tunnare än den borde:

- **Varje smäll ser likadan ut.** Alla explosioner är samma radiella gnistspray i en slumpfärg
  (`_explode`). Riktiga fyrverkerier har FORMER — pil/willow som droppar, ring, hjärta,
  crackle/tindrande. Här är smäll nummer tjugo identisk med nummer ett. Det är spelets största
  visuella slentrian, just i ett spel som *handlar* om fyrverkeri.
- **Målen är inerta och enformiga.** En tänd stjärna blir ⭐ och glöder — sen händer inget mer.
  Ingen kedjereaktion, ingen kombo-fest när ett skott tänder två stjärnor (det kan ske via
  radien men firas inte särskilt). Stjärnorna är spridda slumpvis, bildar aldrig en form.
- **En enda rakettyp.** Samma lilla raket varje skott. Ingen stor "boomare", ingen multi-shot,
  ingen fontän — inget att se fram emot eller variera med.
- **Tom himmel, ingen publik.** Atmosfärisk men folktom: ingen måne, ingen siluett av tak/träd,
  ingen som tittar och säger "oooh!". Fyrverkeri utan en reagerande omgivning känns ensamt.
  Ingen maskot (Bobo/Elvira) trots att CLAUDE.md inbjuder till det.
- **UI-ljud, inte fyrverkeri-ljud.** `whoosh`/`pop`/`reveal`/`pling`/`celebrate` är generiska
  gränssnittsblipp. Det saknas det som DEFINIERAR fyrverkeri: en stigande vissel-pip vid
  uppskjutning och ett dovt "BOM" + sprakande crackle vid smällen.
- **Prick-banan + auto-assist kan lösa spelet åt en.** För den vuxne/äldre löser prickbanan
  siktet; för den minsta gör assisten jobbet. Skicklighetsbandet är smalt (acceptabelt no-fail,
  men gör att mittengruppen har lite att bita i).

Kort sagt: en **utmärkt sikt-leksak med monotont fyrverkeri** — samma gnistspray, inerta mål,
inget ljud-"bom" och ingen som tittar på.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Smäll-former.** Ge `_explode` flera mönster — ring, willow (gnistor som bågar och
  droppar långsamt), hjärta, crackle (blinkande mini-gnistor) — vald per stjärnas hue. Varje
  tändning blir ett eget litet skådespel istället för samma spray.
- **[Medium] Kombo-fest.** När ETT skott tänder 2+ stjärnor: extra "BOM", större sken, en glad
  "Dubbelt!"/"Trippel!" och en kort kedje-gnistlänk mellan dem. Belönar smart sikte utan att
  straffa annars.

### Variation & överraskning
- **[Medium] Stjärn-konstellationer.** Lägg stjärnorna i en form (hjärta, smiley, blomma) som
  framträder som en bild när alla är tända → ett "wow, det blev något!"-ögonblick.
- **[Quick] Rakettyper.** Variera färg/form; ibland en "stor raket" som ger en jättesmäll.

### Juice
- **[Quick] Riktiga fyrverkeri-SFX:** uppskjutnings-vissel + "bom" + sprakande crackle (via
  `npm run sfx`). Det enskilt mest definierande lyftet.
- **[Quick] Smäll-blixt + mikroskak.** En kort, subtil ljusning av hela skyn och en liten skärm-
  skak skalad efter smällens storlek. Rök-puff vid rampen och kvardröjande glöd-strån.

### Progression
- **[Medium] Levande himmel högre upp.** Lägg en måne / en stadssiluett / långsamt drivande
  målstjärnor, och låt tända stjärnor sitta kvar och bygga en bild över nivån.

### Karaktär & berättelse
- **[Deep] En publik som tittar.** Bobo (eller Elvira) står på marken och ropar "Oooh! Aaah!"
  vid varje smäll och klappar vid finalen — fyrverkeriet får någon att imponera på.

### Ljud
- **[Quick] Egen fyrverkeri-ljuduppsättning** (vissel/bom/crackle/final-salva) + lugn natt-
  ambient med syrsor.

## 5. Status / loggar

- 2026-06-30: Doc skriven. Speltestad (errorCount 0, skärmdump granskad — natthimmel + ramp).
  Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] riktiga fyrverkeri-SFX + smäll-blixt + [Medium] smäll-
  former** — gör själva fyrverkeriet lika bra som siktet redan är.
- 2026-07-01 🔧 **Första-omgången byggd (alla tre):** (1) **Smäll-former [Medium]** — `_explode`
  har nu fem mönster (burst/ring/willow/heart/crackle), slumpat per smäll via en `spark()`-hjälpare
  → varje tändning blir ett eget skådespel. (2) **Fyrverkeri-SFX [Quick]** — synt uppskjutnings-
  vissel (stigande ton) + dovt "bom" + sprakande crackle via `audio.tone()`, med
  `audio.sample('vissel'/'bom')`-hookar för riktiga klipp när MOSS ([[real-audio-sfx]], #3) kört.
  (3) **Smäll-blixt + mikroskak [Quick]** — kort, subtil additiv sky-ljusning (`_flashG`, cap 0.22)
  + `_fx`-skak, båda ticker-drivna (ingen gsap → exit-säkert). Städning: oanvända `Circle`/`puff`-
  importer + `ctx`-param i `_loadLevel` bort. errorCount 0.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).**
  - **P0 ASSETS:** målstjärnorna var `✨`/`⭐` som `Text` — nu ritade femuddiga stjärnor som
    får gnistkors och ljus kärna när de tänds. Otänd stjärna ritas alltid i samma dova blågrå,
    annars såg den redan "färgad" ut och tändningen blev ingen synlig förändring. Inga
    `Text`-noder kvar.
  - **Vindflaggan låg på (96, 96) och hamnade delvis bakom skalets hemknapp (70, 64)** — syns
    bara i skärmdumpen. Flyttad till (214, 84).
  - **[Medium] Levande himmel + [Deep] en publik som tittar:** horisonten har nu måne med
    kratrar, en stadssiluett med slumpade lysande fönster och två granar. Bobo och Elvira står
    på marken med armarna i luften, hoppar till vid varje smäll och ropar "Oooh!"/"Aaah!"
    (throttlat). Hela nedre halvan av skärmen var förut tom.
  - **Grind:** `npm run check --game fyrverkeri` 0 fel · `npm run test` grönt ·
    `_idleprobe 20s` → `idleFramsteg: 0`, `efterSpel: 1`. 7 nya repliker väntar på röstklipp.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): **natthimlen var 48 staplade rektanglar** — samma mönster som `scene.js` lämnade i LYFTPLAN rad 3, men gömt i en spelfil, och banden syntes i mätningen (tre fält à ~38 000 px). Nu en `verticalFill` ur `lib/form.js`: EN rit-operation i stället för 48, jämn toning. Den lokala `lerpColor` blev oanvänd och togs bort.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): natthimmel/blixt breddade till hela telefonskärmen (±BLEED), stjärnor spawnar i bleed-zonen, raket-cull och vindpilars wrap mot `ctx.view`. Testad 1280×720 + 952×428: 0 fel.
