// Nyheter per version — det föräldern läser i menyns "Nyheter"-ruta (lib/domModal.js).
//
// Skrivs för en FÖRÄLDER, inte för en utvecklare: vad som syns eller känns annorlunda för
// barnet, med spelens riktiga namn. Inga filnamn, inga mätvärden. Nyast först.
//
// `version` är MAJOR.MINOR som i versionspillret (`v1.279` → '1.279'). En omgång som bumpade
// flera MINOR i rad (nattkörningen: ett spel per version) får `fran` för sin första version.
// `npm run check` varnar om den aktuella versionen i package.json saknar en post.
// Ren data — check.mjs importerar filen i node.

export const NYHETER = [
  {
    version: '1.409',
    fran: '1.406',
    datum: '2026-10-02',
    titel: 'Repris, vind och en ärligare sikteslinje',
    punkter: [
      'När kulan i Kulbanan rullar ner i hinken visas slutet av rullningen en gång till i slow motion, med ett orange spår efter kulan. Sedan kommer firandet. Den som inte vill vänta trycker bara, så börjar firandet direkt.',
      'Pruttvinden i Bajs och Kiss blåser nu från kompisens hand mot pottan, och luften syns som turkosa bågar.',
      'I Bowling studsar prickarna mot kantstödet precis som klotet gör, och de slutar där banan tar slut. I Rulla Bollen Hem studsar prickarna mot kanterna på samma sätt.',
      'Fläkten i Studsa Ner, vågorna i Pruttbadet och dammens vågor hos Grodan fungerar som förut, men de bygger nu på samma grund som kommande spel ska använda.',
    ],
  },
  {
    version: '1.405',
    fran: '1.404',
    datum: '2026-10-02',
    titel: 'Maskiner som tar emot',
    punkter: [
      'I Kugghjulen känns det i veven att karusellen hänger på maskinen: en stor maskin tar en stund att få upp i fart och stannar lite fortare när man släpper. Veven går alltid runt, och ett tryck vevar fortfarande av sig själv.',
      'Propellern i Kulbanan snurrar på riktigt nu. Kulan som träffar den knuffar den fortare, saktare eller baklänges, och kulan studsar olika varje gång. Sedan hittar propellern tillbaka till sin egen takt.',
    ],
  },
  {
    version: '1.403',
    fran: '1.396',
    datum: '2026-10-02',
    titel: 'Grepp, kast och en ventil',
    punkter: [
      'I Leksakslådan hålls leksaken i mitten och känns tyngre eller lättare beroende på vad det är. Den som vill kan kasta leksaken i korgen, men det går lika bra att bära dit den som förut.',
      'I Valpens Bajs går det att slänga bajset ur skyffeln rakt ner i tunnan, och i Mata Monstret går det att kasta maten i munnen. Det är en extra lek, och att dra dit fungerar precis som förut.',
      'I Spindelnätet dras bytet in i tråden och svänger på vägen till nätet.',
      'Tornet i Bygg Tornet gungar lite när en kloss landar, men det rasar aldrig.',
      'I Vattenvägen kommer vattnet först när barnet vrider på ventilen vid kranen. Det går att snurra runt hjulet eller bara trycka på det, och redan första trycket sätter igång vattnet.',
      'Tårtan i Tårta i Ansiktet kastas som förut. Släpper man den långsamt landar den mjukt i stället för att flyga iväg.',
    ],
  },
  {
    version: '1.395',
    fran: '1.393',
    datum: '2026-10-02',
    titel: 'Grund för gungor och grepp',
    punkter: [
      'Bakom kulisserna: en gemensam grund för saker som gungar, snurrar och hålls i handen. Balanstornet, Vippbrädan och Knuffa Tornet använder den redan och känns precis som förut. Kommande versioner bygger vidare på den i fler spel.',
    ],
  },
  {
    version: '1.392',
    fran: '1.387',
    datum: '2026-10-02',
    titel: 'Det man rör knuffar och fjädrar',
    punkter: [
      'Korgen i Fånga Frukten och tratten i Studsa Ner knuffar till det som faller när man drar dem snabbt, i stället för att saker glider rakt igenom kanten. Allt stannar kvar i bild.',
      'Paddlarna i Flipperspel slår till kulan med sin egen fart, så ett slag skickar iväg kulan med mer kraft.',
      'Molnen i Enhörningen Elvira trycks ihop när Elvira landar på dem och kastar upp henne igen. Ju högre hon faller ifrån, desto högre studsar hon, men aldrig upp i taket.',
      'Plankan i Vippbrädan sviktar till när vikten slår i, mer ju tyngre vikten är. I Fallskärmen fjädrar gräsmattan när hopparen landar, och den tunga hopparen sjunker djupare och studsar högre än den lätta.',
    ],
  },
  {
    version: '1.386',
    fran: '1.384',
    datum: '2026-10-02',
    titel: 'En riktig studsmatta',
    punkter: [
      'Mattan i Studsmattan fjädrar på riktigt nu. Ju högre kaninen faller, desto högre studsar den, upp till en topp som alltid syns på skärmen. Mattan buktar och gungar efter varje landning och följer med när man drar i den. Kaninen studsar vidare medan den firar, och ett tryck strax före landningen hörs också.',
      'Saftbaren går lite lättare på surfplattor med mindre kraft.',
    ],
  },
  {
    version: '1.383',
    fran: '1.379',
    datum: '2026-10-02',
    titel: 'Ett finger i taget',
    punkter: [
      'Om ett drag avbryts mitt i, till exempel när plattan svarar på en kantgest eller ett samtal, fastnar saken inte längre. Den släpps där fingret var, och man kan genast ta nästa. Förut kunde Sortera Skräp och Popcornkalaset sluta svara på nya tryck.',
      'En handflata eller ett andra finger som råkar nudda skärmen tar inte längre över det barnet drar i eller siktar med, till exempel i Sortera Skräp och Spindelhjälten. Saken följer det finger som tog tag i den.',
    ],
  },
  {
    version: '1.378',
    fran: '1.375',
    datum: '2026-10-02',
    titel: 'Saker som landar',
    punkter: [
      'I Stor och Liten faller sakerna ner på filten när rundan börjar: det stora landar med en tung duns, det lilla studsar flera gånger. Så hörs och syns det vilken storlek saken har innan barnet väljer.',
      'Skräpet i Sortera Skräp landar på gräset framför tunnorna och står nu ordentligt på marken. Formerna i Passa Formerna har fått en hylla att landa på bakom lådan.',
      'Fröna i Plantera Frön faller ner på gräskanten i stället för att hänga i luften, och man behöver dra dem en bit ner till hålet. Man kan alltid ta tag i en sak medan den faller.',
    ],
  },
  {
    version: '1.374',
    fran: '1.368',
    datum: '2026-10-02',
    titel: 'Saker som fjädrar till',
    punkter: [
      'I Bygg en Kompis gungar antenner, öron och tofsar när man kittlar kompisen eller byter en del. Djuren i Loopdjuren flaxar med öronen när de spelar.',
      'Hamburgaren i Hamburgerbygget svajar åt sidan när ett nytt lager landar, men välter aldrig. Bilen i Zackes biltvätt fjädrar på hjulen när den bromsar in och när fågelbajset landar.',
      'Stenarna i Golvet är lava sviktar när man hoppar på dem. Vagnarna i Siffertåget gungar när tåget startar och stannar, och klossen i Bygg Tornet gungar i kranens lina när den hängs på.',
    ],
  },
  {
    version: '1.367',
    fran: '1.365',
    datum: '2026-10-02',
    titel: 'Förberedelser bakom kulisserna',
    punkter: [
      'Ingenting ändras i spelen ännu. Appen har fått nya byggstenar så att saker snart kan fjädra till när man rör dem och dunsa ner på marken när de kommer in i bild, i stället för att bara dyka upp i luften.',
    ],
  },
  {
    version: '1.364',
    fran: '1.361',
    datum: '2026-10-02',
    titel: 'Jämnare fysik och lättare att klä på',
    punkter: [
      'Bollarna i gropen i Studsbollar, glitterregnet i Enhörningens Glitterbajs och glasskulorna som sätter sig i Glasstornet rör sig nu likadant på en långsam platta som på en snabb.',
      'I Klä efter Vädret fastnar plagget på Elvira även om man släpper det en bit vid sidan om henne.',
    ],
  },
  {
    version: '1.360',
    datum: '2026-10-02',
    titel: 'Spelbiblioteket visar vad som är nytt',
    punkter: [
      'Sorteringsknappen uppe till höger i spelbiblioteket har fått ett tredje läge: 🔄 visar de spel som senast fått nya saker först. Ett tryck till ger A–Ö, och ett till tillbaka till de nyaste spelen. Biblioteket minns läget.',
    ],
  },
  {
    version: '1.359',
    fran: '1.289',
    datum: '2026-10-02',
    titel: 'Nattens stora lyft: nya platser, mer variation och fysik som känns rätt',
    punkter: [
      'Nya platser att leka på: Räkna Äpplena har ett riktigt äppelträd, Regnbågsmålaren Elvira en by vid sjön, Enkelt Pussel ligger på ett träbord, Bobos Bowling har en riktig bowlinghall, Kittla Figuren ett barnrum, Tårta i Ansiktet ett cirkustält med publik som jublar, Kugghjulen en verkstad där katten vaknar, Grävmaskinen en byggarbetsplats med tornkran, Spindel-Zacke Svingar hus med fönster och djur som hejar, Spindelnätet en månbelyst trädgård, Studsa Ner en spelautomat med blinkande lampor, Elementlekplatsen ett labb, Fyrverkeri en stad där fönstren tänds, och Rulla Bollen Hem en trädgård med häck, hus och fjäril.',
      'Skog, träd och gräs i förgrunden ger djup i Vilket Djur Låter Så?, Vändkort, Vippbrädan, Klä på Nallen, Ballonglyft, Stor och Liten (sakerna ligger på en picknickfilt), Spindelhjälten och Bygg Tornet (byggplats med kran). Plask i Vattnet har fått sandbotten och tång.',
      'Mer omväxling varje gång man spelar: målen, korgarna och formerna hamnar på nya ställen i Studsbollar, Studsmatta, Enhörningen Elvira, Vippbrädan och Bajs och Kiss; käglorna står i nya formationer i Bowling; motiven kommer i ny ordning i Enkelt Pussel och Spåra Linjen; Räkna Äpplena ber om olika antal; tornet, glassen, maten, djuret och reglerna skiftar i Knuffa Tornet, Glasstornet, Lägerelden, Tvätta Djuret och Glittergrottan. Svårigheten följer nivån som förut.',
      'Små roliga saker: ankan i Pruttbubbelbadet guppar på vågorna, bubblorna i Klämbubblor stöter i varandra, molnet i Blixt och Dunder går att kasta, bajset studsar och låter i Bajs och Kiss, en pysballong far runt och pruttar i Poppa Ballongerna, kistan i Enhörningens Glitterbajs svämmar över, pingvinerna i Snöbollen följer bollen med blicken och nallen tittar på plagget man håller.',
      'Mer liv: Plantera Frön har fått riktiga blommor som vajar och går att trycka på, Bobo i Saftbaren har fått en kropp, Elvira i Ballonglyft rör sig, barnets egen figur hoppar över lavan i Golvet är Lava, kranen i Borsta Pappas tänder går att sätta på, och kornen i Unika Knytt virvlar upp när man trycker på glaset. Fyrverkeriets gnistor hänger kvar och driver med vinden.',
      'Ringar och plattor bakom föremålen är borta i Sortera Skräp, Trollkarlens Blandning och Tryck och Förvandla — sakerna ligger på gräs, sten och snö i stället.',
      'Fysiken rör sig lika på långsamma och snabba plattor: mjuka saker som marshmallowen i Lägerelden, glasskulorna, fallskärmens kupol, trådarna i Spindelnätet, slangen i Zackes biltvätt och bubblorna i badet beter sig nu likadant även när plattan hackar.',
    ],
  },
  {
    version: '1.288',
    datum: '2026-10-01',
    titel: 'Nätskott på stan: resan hem i kvällen',
    punkter: [
      'Bilfärden går nu från eftermiddag till solnedgång och kväll: himlen blir rosa och sedan mörk med måne och stjärnor, fönstren tänds ett efter ett och gatlyktorna lyser. När bilen kör ut igen går solen upp.',
      'Varannan runda regnar det — djuren har paraply, och nätet kan blåsa iväg det.',
      'Tre nya uppdrag: snärj in saker med nätbollen, fånga monstret som tittar ut genom fönstret, och tänd lyktorna med nätet när det blir mörkt.',
      'Hemma väntar någon i dörren — ibland barnets eget knytt eller kompis — som vinkar, hejar på varje vän som kommer hem och tänder lamporna i huset. Hemmet har fått trädgård, staket och rök ur skorstenen.',
      'Nätbollen träffar nu det man siktar på i stället för att fastna på saker längs trottoaren.',
    ],
  },
  {
    version: '1.287',
    datum: '2026-10-01',
    titel: 'Barnets knytt och kompisar finns nu i 22 spel',
    punkter: [
      'Ytterligare 16 spel kan nu visa knytten barnet kläckt i Unika Knytt och kompisarna från Bygg en Kompis — och knytten från soffan på Popcornkalaset. Den man nyss gjort kommer först, sedan ungefär varannan omgång. Utan egna figurer ser spelen ut som vanligt.',
      'De äter: figuren dricker saft i Saftbaren, äter de rostade bitarna vid Lägerelden, tuggar morötterna på picknicken i Studsmattan, tar emot burgaren i Hamburgerbygget och får frukten i munnen i Fånga frukten. I Stor och liten kan barnets figurer vara de stora och små som matas.',
      'De hittas och räddas: barnets figur sitter fast högst upp i Bygg tornet, är gömd i en ballong i Poppa ballonger, kikar upp ur ett hål i Klappa mullvaden, gömmer sig under koppen i Vart tog det vägen (och ställer sig på hyllan), sover på skatten i Skattjakt i mörkret och vaknar i husets dörr när lampan tänds i Blixt och dunder.',
      'De är med och leker: figuren följer spåret hem i Följ spåret, väntar på perrongen i Siffertåget, är bilägare i Zackes biltvätt och hejar från bänken i Bowling.',
      'Rättat: när ett nytt knytt dök upp första gången kunde spelets introduktion avbryta "Titta, ditt knytt är här!" så att bara namnet hördes. Nu hörs hela raden.',
    ],
  },
  {
    version: '1.286',
    datum: '2026-10-01',
    titel: 'Knytten från soffan hälsar på i andra spel',
    punkter: [
      'De knytt som sitter i soffan på Popcornkalaset kan nu dyka upp i andra spel under samma stund — i presenten i Ballonglyft, vid korgen i Vippbrädan och Studsbollar, som kund i Glasstornet och gömda i Titt ut, pappa! Det ger fler olika figurer att träffa.',
      'Barnets egna knytt och kompisar kommer fortfarande först.',
    ],
  },
  {
    version: '1.285',
    datum: '2026-10-01',
    titel: 'Barnets egna knytt och kompisar hälsar på i andra spel',
    punkter: [
      'Knytten man kläckt i Unika Knytt och kompisarna man fotograferat i Bygg en Kompis dyker nu upp i andra spel. Den man nyss gjort kommer alltid först, och sedan ungefär varannan omgång. Har barnet inte gjort några än står spelets vanliga figurer kvar.',
      'Popcornkalaset: ett av barnets egna knytt eller kompisar sitter i soffan och äter popcorn.',
      'Ballonglyft: ibland är det barnets eget knytt eller kompis som hoppar ur presenten och landar i Elviras famn.',
      'Glasstornet: barnets figur står och väntar på glassen och mumsar när den kommer.',
      'Vippbrädan och Studsbollar: barnets figur står vid korgen, följer grodan eller bollen med blicken och jublar.',
      'I Titt ut, pappa! gömmer sig barnets figur på ett av ställena och flyttar sedan in på raden med det man hittat.',
      'Knytten säger sitt namn när de dyker upp första gången, och kompisarna sjunger sin egen melodi när de jublar.',
    ],
  },
  {
    version: '1.284',
    fran: '1.280',
    datum: '2026-09-30',
    titel: 'Fyra spel har fått nytt liv',
    punkter: [
      'Enhörningen Flyger: himlen skiftar mellan dag, skymning och kväll, enhörningen är större och drar en regnbåge efter sig, nya sorters ringar och en regnbågsport att flyga mot. Stjärnorna samlas i en säck.',
      'Färgregn: Bobo står i regnet med ett paraply eller en hink i färgen man letar efter och fångar dropparna. Regnet faller ur moln, och på himlen växer en regnbåge fram för varje färg man lärt sig.',
      'Peka på Kroppen: Zacke frågar själv i en pratbubbla, står på en lekplats, pekar när man behöver hjälp och dansar när rundan är klar. Ibland frågar han "Vad är det här?"',
      'Skuggmatchning: en picknick i parken — sakerna står på en bänk och skuggorna ligger på filten.',
    ],
  },
  {
    version: '1.279',
    datum: '2026-09-30',
    titel: 'Appen hämtar nya versioner själv',
    punkter: [
      'Appen letar efter en ny version när den öppnas, när den väcks ur bakgrunden och varje gång man backar ut till startsidan. Den nya versionen tas i bruk på startsidan — aldrig mitt i ett spel.',
      'Knappen med versionsnumret finns kvar om du vill leta direkt.',
      'Den här rutan: nyheterna för varje version, öppnas från startsidan.',
    ],
  },
  {
    version: '1.278',
    datum: '2026-09-30',
    titel: 'Solen flyttade',
    punkter: ['I ett fyrtiotal spel låg solen bakom hemknappen och såg ut som en gul fläck. Nu står den fritt på himlen.'],
  },
  {
    version: '1.277',
    fran: '1.266',
    datum: '2026-09-30',
    titel: 'Tolv spel har fått en ordentlig uppfräschning',
    punkter: [
      'Djurorkester: djuren står fritt på en riktig scen, Bobo dirigerar, och nya djur kommer till varje konsert.',
      'Klä efter Vädret: kläderna hänger på ett klädstreck i ett rum med fönster, och vädret kan blåsa.',
      'Siffertåget: rösten frågar vagn för vagn, tåget går i en egen värld med station, och ett nytt läge med luckor.',
      'Härma Melodin: fyra sjungande varelser på en konsertscen, med dirigent-Bobo och byte av tema.',
      'Magnetfiske: en riktig damm med strand och näckrosor, och ibland en ovanlig fångst.',
      'Kulbanan: släppknappen ligger inte längre för nära hemknappen, och en ny propellerdel.',
      'Vattenvägen: ett kaklat badrum, rören står på en hylla, växten lever, och T-rör till två muggar.',
      'Följ Spåret: en hel äng med slingrande stig och tassavtryck, och ett hus med rök ur skorstenen som mål.',
      'Vilket Djur Låter Så?: djuren kliver ut ur korten och står på ängen, och nya platser — bondgård, damm och skog.',
      'Vad Försvann?: ett riktigt barnrum där filten är av tyg.',
      'Vart Tog Det Vägen?: en trolleriföreställning med ridå, strålkastare och trollkarls-Bobo.',
      'Tvätta Djuret: leran blir riktiga stänk, svampen blir smutsig och sköljs ren, och det skummar där man gnuggar.',
    ],
  },
  {
    version: '1.265',
    fran: '1.263',
    datum: '2026-09-26',
    titel: 'Nytt spel: Popcornkalaset',
    punkter: [
      'Häll majs i grytan, låt det poppa och fyll gästernas skålar.',
      'Påsen och grytan styrs med en enda rörelse: bär dem dit och tryck nedåt så lutar de.',
    ],
  },
  {
    version: '1.262',
    fran: '1.254',
    datum: '2026-09-25',
    titel: 'Nytt spel: Grodan Slurp',
    punkter: [
      'En groda med klibbig tunga: tryck där tungan ska fastna, fånga flugorna och håll på grodan för ett superhopp med volt.',
      'En stor värld att klättra i och många miljöer: träsk, öken, strand, is, fors, skog, kök, vardagsrum och badrum.',
    ],
  },
  {
    version: '1.253',
    fran: '1.251',
    datum: '2026-09-23',
    titel: 'Rösten blir inte avbruten',
    punkter: [
      'I många spel kunde en ny replik klippa av den förra mitt i meningen. Nu väntar rösten in sig själv.',
      'Firandet när ett spel är klart hördes ibland två gånger — nu bara en.',
    ],
  },
]
