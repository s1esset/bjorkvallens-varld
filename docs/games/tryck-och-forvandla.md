# Tryck och Förvandla (`tryck-och-forvandla`)
> 🎉 roligt · tap · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

På en mjuk ängsscen (sol, kullar, moln) står några "förtrollade" saker på var sin
rund platta — ett moln, en bil, en stjärna, en måne. Sakerna guppar lugnt (sin-sväv)
och "andas" (breathe-tween) som en lockelse. Jag trycker på en sak → den squashar ihop,
en vit poff + ring spricker ut, emojin byts till nästa steg i sin kedja (☁️→🌧️→🌈,
🚗→🚌→🚀, 🌰→🌱→🌿→🌻 …), en liten emoji flyter uppåt, och saken studsar upp igen.
Vid sista steget ropar rösten resultatet ("En regnbåge!"), gnistor yr, och en prick
fylls i raden längst upp. När ALLA saker i omgången är fullt förvandlade kommer
konfetti + beröm + stjärna + klistermärke, scenen får en mjuk skak, och en ny, lite
större/längre omgång dyker upp (fler saker, längre kedjor med nivån, tak vid nivå 6).

Tomt tryck bredvid sakerna ger ett mjukt ljud + ring + gnistor och en slumpsak vinglar
lekfullt — aldrig "fel". Idle ~7s → en lugn uppmaning ("Vad blir det här?") + en sak
poppar som ledtråd. Röst är strypt (650ms) så snabba tryck inte staplar tal.

**Funkar bra:** kärnan är ren och begriplig (tryck → något blir något nyare/finare,
alltid), övergångs-animationen (squash→byt→studs) är saftig, no-fail är intakt, och
progressionen (fler saker + längre kedjor) ger lugn växt. En stark, korrekt MVP.

*(Skärmdump: ängsscen, moln/bil/stjärna/måne på pads, konfetti efter klar omgång.)*

## 2. Ursprunglig plan & tankeprocess

Enligt kodens header: en "magisk orsak-verkan-lek". Tanken är samma trygga 2-årings-loop
som Klämbubblor (tryck → kul, alltid) men med ett frö av **berättelse och pedagogik**:
varje sak har en *livscykel/förvandling* (frö blir blomma, larv blir fjäril, ägg blir
höna) och rösten sätter ord på svenska på varje resultat. Djupet skruvas no-fail: högre
nivå = fler saker och längre kedjor (2→3→4 tryck), aldrig svårare på ett bestraffande
sätt. Blandade kedjelängder gör att korta belöningar finns lågt och längre "bygg upp"
finns högt.

## 3. Vad gör det lättjefullt / tunt

Grunden är gedigen, men en kräsen spelare/förälder ser snabbt det billiga:

- **Varje tryck är en deterministisk emoji-swap.** Trycket avancerar ALLTID till exakt
  nästa emoji i kedjan — det finns inget val, ingen gren, inget "vad ska det bli?".
  Spelaren utför en på förhand bestämd sekvens; ingen agens utöver att peka.
- **Magin är generisk — samma poff för allt.** Ett frö som gror och en bil som blir raket
  får den *identiska* vita ringen + puffen (`_poof` skiljer bara på stor/liten, inte på
  *vad*). Inget kedjespecifikt: inga gröna blad när plantan växer, inget regn ur molnet,
  ingen rök/eld när raketen tänds, inga hjärtan vid djuren. Förvandlingen *berättas* (röst)
  men *visas* inte med egen karaktär.
- **Inget förvandlat stannar kvar i världen.** Den färdiga blomman/regnbågen/raketen
  flyter upp som en liten emoji och försvinner. Ängen blir aldrig en äng *full av blommor*,
  himlen behåller aldrig regnbågen. Det finns inget att samla, ingen "trädgård som växer".
- **Sakerna lever inte tillsammans.** De guppar var för sig på sina pads. En klar sol
  bredvid en planta gör ingenting; en fjäril flyger inte iväg. Scenen är en statisk tapet
  bakom ett centrerat rutnät av pads.
- **Pods + prickrad ser "genererat" ut.** Jämn rutnätslayout (`_layout`) med likadana
  cirkelpads och en abstrakt grå/färgad prickrad — funktionellt men inte lekfullt eller
  tematiskt.
- **Ingen figur/maskot.** CLAUDE.md har Bobo; här tittar ingen på, ingen reagerar, ingen
  "samlar in" det förvandlade. Belöningen är den generiska, delade konfettin.
- **Tunn ljudpalett.** `pop`/`reveal`/`pling` — inga förvandlingsljud, ingen stigande
  tonhöjd när kedjan klättrar, ingen ambient.

Kort sagt: *snyggt och pedagogiskt korrekt*, men förvandlingen är en **scriptad
bildbyte utan eget uttryck**, och världen minns inget av det jag skapat.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Det förvandlade stannar i världen.** Sista steget "lämnar pad:en" och blir
  en del av scenen: blomman planteras i en ängsrad längst ner, regnbågen bågar kvar på
  himlen, raketen flyger iväg med en svans. Bygg en liten "samling" som fylls över
  omgångar → en anledning att återkomma och en känsla av att *jag byggde det här*.
- **[Deep] Grenande förvandlingar = riktigt val.** Vissa saker erbjuder två utfall: tryck
  på vänster/höger halva (eller varannan tryckning slumpar) → ägg→kyckling *eller*
  ägg→ankunge, moln→regn *eller* moln→snö. Inget blir fel, men *mitt* tryck avgör vad det
  blev — agens utan svårighet.

### Variation & överraskning
- **[Quick] Kedjespecifik poff.** Egna partiklar/färg per kedja: gröna blad när växten
  gror, blå droppar ur molnet, rök + gnistor när raketen tänds, hjärtan vid djuren,
  stjärnstoft vid måne/stjärna. Direkt mycket mer "magi" för låg insats.
- **[Quick] Fler kedjor + temarundor.** Utöka poolen och kör ibland tematiska omgångar
  (en "djur"-runda, en "väder"-runda) så två rundor aldrig känns lika.
- **[Medium] Grannreaktion.** När en sak blir klar puttar den grannen lite (en klar sol
  får grannblomman att blomma snabbare / gnistra). Saker som *känns* sammanlänkade.

### Juice
- **[Quick] Förvandlingsljud med stigande tonhöjd** — varje steg uppåt i kedjan låter en
  ton högre, sista steget = ett litet "ta-da". Egen klang per kedjetyp (sprätt för växt,
  whoosh för raket).
- **[Quick] Starkare slutpose per sak.** Vid sista steget: stjärnan tindrar, månen får
  ett mjukt sken, blomman vajar — en kort egen "klar"-animation utöver floatText.

### Progression
- **[Medium] Stegtrappa per pod.** Visa små punkter ovanför varje pad (t.ex. ●○○ för en
  3-stegskedja) så barnet *ser* hur många tryck som är kvar → förväntan och "en till!".

### Karaktär & berättelse
- **[Deep] Bobo i ängen.** Maskoten vandrar bakom sakerna, säger "Oooh!" när något
  förvandlas, och vid klar omgång springer fram och "planterar"/samlar det skapade i
  samlingen — egen vinst-animation istället för generisk konfetti.

### Ljud
- **[Quick] Varierad resultat-röst** (fler formuleringar per resultat) + en lugn
  ängs-ambient (fågel/vind) i bakgrunden.

## 5. Status / loggar

- 2026-06-30: Doc skriven (ersätter den gamla bygg-specen med en spelar-granskning).
  Speltestad (errorCount 0, skärmdump granskad). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] kedjespecifik poff + stigande förvandlingsljud +
  stegtrappa per pod** — störst upplevd magi för minst risk, rör inte kärnloopen.
