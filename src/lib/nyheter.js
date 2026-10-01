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
