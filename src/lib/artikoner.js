// Delat ikonbibliotek — parametriskt ritade spelobjekt (P0 ASSETS).
// Bröts ut ur vandkort när skuggmatchning behövde samma 44 figurer; ett andra
// exemplar av samma 300 rader hade varit precis det /simplify letar efter.
//
// drawIcon(key, size, opts) returnerar en Graphics centrerad i (0,0), skalad så att
// figuren ryms inom ungefär ±size/2 px. Nyckeln är en emoji-sträng — spelen
// använder samma nyckel för uppslag av namn, ljudklipp och kategori.
//
// Volym (LYFTPLAN C8): varje mall fyller sin HUVUDFORM med en gradient ur lib/form.js —
// klot (sphereFill) för runda kroppar, rör (cylinderFill) för stammar och stavar,
// belyst-uppifrån (topLightFill) för allt annat. Smådetaljer lämnas platta med flit:
// ögat läser volymen på den stora formen, och varje distinkt gradient är en egen textur
// att binda. En handrullad "gloss"-ellips bredvid en platt fyllning är samma dubblett
// som gradienten ersätter — där mallen hade en är den borttagen, inte kvarlämnad.
import { Graphics } from 'pixi.js'
import { lerpColor } from './scene.js'
import { logIcon } from './gamelog.js'
import { sphereFill, cylinderFill, topLightFill, detaljniva } from './form.js'

const ART = {
  // djur: [pälsfärg, öronform, nosfärg, extra]
  '🐶': ['animal', 0xc98a4b, 'flop', 0xf0d7ae], '🐱': ['animal', 0xb6c0cc, 'point', 0xdfe6eb],
  '🦊': ['animal', 0xef8a3d, 'point', 0xfff0d8], '🐰': ['animal', 0xf2f2f4, 'long', 0xffe0e6],
  '🐻': ['animal', 0x9a6b45, 'round', 0xd9b48a], '🦁': ['animal', 0xf0b850, 'mane', 0xffe0a8],
  '🐸': ['animal', 0x7ed06a, 'eyes', 0xdff3c4], '🐵': ['animal', 0xa9714a, 'round', 0xf0d7ae],
  '🐼': ['animal', 0xf5f5f5, 'panda', 0xffffff], '🐧': ['animal', 0x3a3a4a, 'beak', 0xffffff],
  '🐮': ['animal', 0xf7f4ef, 'cow', 0xffc9cf], '🐷': ['animal', 0xf7b9c4, 'pig', 0xffd0da],
  // frukt: [kroppsform, färg, bladfärg]
  '🍎': ['fruit', 'round', 0xe0392b, 0x5bbf6a], '🍌': ['fruit', 'crescent', 0xffd35c, 0x8a6a2a],
  '🍓': ['fruit', 'berry', 0xe0392b, 0x5bbf6a], '🍇': ['fruit', 'bunch', 0xa78bfa, 0x5bbf6a],
  '🍊': ['fruit', 'round', 0xff9d3d, 0x5bbf6a], '🍉': ['fruit', 'slice', 0xff6b6b, 0x5bbf6a],
  '🍐': ['fruit', 'pear', 0xc9e05a, 0x5bbf6a], '🍒': ['fruit', 'cherry', 0xe0392b, 0x5bbf6a],
  '🥝': ['fruit', 'kiwi', 0x8fbe4a, 0x5bbf6a], '🍑': ['fruit', 'round', 0xffb38a, 0x5bbf6a],
  '🥥': ['fruit', 'coco', 0x8a5a3b, 0x5bbf6a], '🍍': ['fruit', 'pine', 0xf0c33c, 0x5bbf6a],
  // fordon: [karossfärg, taktyp]
  '🚗': ['vehicle', 0x4aa3df, 'cab'], '🚒': ['vehicle', 0xe0392b, 'ladder'],
  '🚜': ['vehicle', 0x5bbf6a, 'big'], '🚌': ['vehicle', 0xffd35c, 'bus'],
  '🚲': ['vehicle', 0x8d99a6, 'bike'], '🚁': ['vehicle', 0x6ad0ff, 'heli'],
  '🚂': ['vehicle', 0x74695f, 'train'], '🚀': ['vehicle', 0xf0f2f5, 'rocket'],
  '⛵': ['vehicle', 0xc98a4b, 'boat'], '🚓': ['vehicle', 0x3a5a78, 'cab'],
  '🚑': ['vehicle', 0xffffff, 'bus'], '🚕': ['vehicle', 0xf0c33c, 'cab'],
  // former: [form, färg]
  '⭐': ['shape', 'star', 0xffd35c], '❤️': ['shape', 'heart', 0xe0392b],
  '🔵': ['shape', 'circle', 0x4aa3df], '🟢': ['shape', 'circle', 0x5bbf6a],
  '🟡': ['shape', 'circle', 0xffd35c], '🟣': ['shape', 'circle', 0xa78bfa],
  '🔶': ['shape', 'diamond', 0xff9d3d], '🌸': ['shape', 'flower', 0xffb3d1],
  '🌙': ['shape', 'moon', 0xffe08a], '🍀': ['shape', 'clover', 0x5bbf6a],
  '🔺': ['shape', 'triangle', 0xe0574f], '💎': ['shape', 'gem', 0x6ad0ff],
  // havsdjur: [kroppsfärg, form]
  '🐠': ['sea', 0xffa63d, 'fish'], '🐙': ['sea', 0xd96aa8, 'octo'],
  '🐳': ['sea', 0x5aa6d6, 'whale'], '🦀': ['sea', 0xe0574f, 'crab'],
  '🐬': ['sea', 0x8fb8d4, 'whale'], '🐡': ['sea', 0xffd35c, 'puffer'],
  '🐢': ['sea', 0x7ed06a, 'turtle'], '🦈': ['sea', 0x9aa4b0, 'fish'],
  '🦐': ['sea', 0xffa08a, 'shrimp'], '🐚': ['sea', 0xffd7c4, 'shell'],
  '🦑': ['sea', 0xd96a6a, 'octo'], '🪼': ['sea', 0xd0b8f0, 'jelly'],
  // baksidornas emblem
  '🐾': ['shape', 'paw', 0xffffff], '🍃': ['shape', 'leaf', 0xffffff], '✨': ['shape', 'sparkle', 0xffffff],
  // tillskott för skuggmatchning
  '🐦': ['animal', 0x6ac0f0, 'beak', 0xd8f0ff], '🐟': ['sea', 0x6fa3c0, 'fish'],
  // bi och uggla har egna kroppar, inte djur-mallens huvud → sista grenen
  '🐝': ['sea', 0xf0c33c, 'bee'], '🦉': ['sea', 0xc98a4b, 'owl'],
  '🍋': ['fruit', 'round', 0xffe14a, 0x5bbf6a],
  '✈️': ['tool', 'plane', 0xd8e6ee], '🔨': ['tool', 'hammer', 0x8a5a3b],
  '✂️': ['tool', 'scissors', 0xc3ccd4], '🔑': ['tool', 'key', 0xd9b44a],
  '🖌️': ['tool', 'brush', 0x8a5a3b], '🥄': ['tool', 'spoon', 0xc3ccd4],
  '☂️': ['tool', 'umbrella', 0xe0392b], '🎁': ['tool', 'gift', 0xe0574f],
  '🍦': ['tool', 'icecream', 0xfff0d8], '⏰': ['tool', 'clock', 0xe0574f],
  '☀️': ['shape', 'sun', 0xffd35c], '🎈': ['tool', 'balloon', 0xe0574f],
  // tillskott för stor-liten
  '🐥': ['animal', 0xffe08a, 'beak', 0xfff6d8], '🌟': ['shape', 'star', 0xffe14a],
  '🧸': ['tool', 'teddy', 0xc98a4b], '🍪': ['tool', 'cookie', 0xd9a56b],
  // tillskott för enkelt-pussel
  '🌳': ['tool', 'tree', 0x5bbf6a], '☁️': ['shape', 'cloud', 0xffffff],
  '🪐': ['tool', 'planet', 0xd9a56b], '🫧': ['shape', 'bubbles', 0xbfe6ff],
  '😻': ['animal', 0xffd7b0, 'point', 0xfff0d8],
  // saknades: fjäril, regnbåge och fotboll används av flera spel men fanns
  // aldrig i vandkorts ursprungliga uppsättning.
  '🦋': ['tool', 'butterfly', 0xa78bfa], '🌈': ['shape', 'rainbow', 0xff6b6b],
  '⚽': ['shape', 'ball', 0xffffff],
  // tillskott för mata-monstret
  '🥕': ['tool', 'carrot', 0xff9d3d], '🍬': ['tool', 'candy', 0xef6aa8],
  '💧': ['fruit', 'drop', 0x4aa3df, 0x5bbf6a],
  // bondgården: vilket-djur-later + djurorkester slog upp fem djur som saknades
  // helt (de föll igenom till den grå cirkeln). Kyckling delar mall med 🐥.
  '🐑': ['animal', 0xf0e6d8, 'wool', 0xfff8f0], '🐴': ['animal', 0xb5764a, 'horse', 0xe8c9a0],
  '🦆': ['animal', 0xf7f3e8, 'bill', 0xffffff], '🐔': ['animal', 0xfaf6ee, 'comb', 0xfff8f0],
  '🐓': ['animal', 0xc46a45, 'rooster', 0xf0d7ae], '🐤': ['animal', 0xffe08a, 'beak', 0xfff6d8],
  // kläder: [form, huvudfärg, accentfärg]. Nycklarna är ORD, inte emoji — kla-efter-vadret
  // hade tre olika huvudbonader på samma 🧢 och två jackor på samma 🧥, så en emoji-nyckel
  // kunde omöjligt skilja dem åt.
  solhatt: ['wear', 'sunhat', 0xf0d9a0, 0xff9ec4], keps: ['wear', 'cap', 0x4aa3df, 0xffffff],
  regnhatt: ['wear', 'rainhat', 0xffd35c, 0xe0a94f], vintermossa: ['wear', 'beanie', 0xa78bfa, 0xfff0d8],
  troja: ['wear', 'shirt', 0x5bbf6a, 0xffffff], klanning: ['wear', 'dress', 0xff9ec4, 0xffffff],
  regnjacka: ['wear', 'coat', 0xffd35c, 0xe0a94f], vinterjacka: ['wear', 'puffer', 0x4aa3df, 0xfff0d8],
  sandaler: ['wear', 'sandal', 0xd9a56b, 0x8a5a3b], skor: ['wear', 'shoe', 0xe0574f, 0xffffff],
  gummistovlar: ['wear', 'boot', 0xffd35c, 0xe0a94f], stovlar: ['wear', 'boot', 0x8a5a3b, 0x6f4a2e],
  vinterstovlar: ['wear', 'snowboot', 0x4a6a8a, 0xfff0d8], kangor: ['wear', 'snowboot', 0x8a5a3b, 0xd9c0a0],
  solglasogon: ['wear', 'shades', 0x2b2b2b, 0x6ad0ff], badbyxor: ['wear', 'trunks', 0x4aa3df, 0xffd35c],
  halsduk: ['wear', 'scarf', 0xe0574f, 0xffd35c],
  // vädertecken (kla-efter-vadret) — själva ledtråden, får inte vara en systemfont-emoji
  regnmoln: ['shape', 'raincloud', 0xc9d4dd], snoflinga: ['shape', 'snowflake', 0x9fd8f0],
  '🍏': ['fruit', 'round', 0x9ccb3b, 0x5bbf6a], // gungans gröna äpple
}

export function drawIcon(key, size = 100) {
  const g = new Graphics()
  const a = ART[key]
  const S = size / 100
  // Strukturaccenter (fruktporer, metalldager, barkådror) läses bara i storlek — på en
  // 50px-bricka blir de brus i stället för detalj. Därför BÅDE den app-breda nivån
  // (form.js setDetaljniva, sänks på svaga plattor) och en storleksgrind, så ett spel som
  // ritar små ikoner slipper betala för streck ingen ändå ser. Nivån läses app-brett och
  // inte per anrop med flit: gradienterna avgörs inne i form.js, så en anropsflagga hade
  // kunnat släcka accenterna men inte gradienterna — ett halvt avstängt läge.
  const accent = detaljniva() >= 2 && size >= 64
  if (!a) {
    logIcon(key, false) // dev-logg: annars är en okänd nyckel helt tyst (grå cirkel)
    g.circle(0, 0, 32 * S).fill(0xc3ccd4).stroke({ width: 4, color: 0x8d99a6 })
    g.eventMode = 'none'
    return g
  }
  const [tpl] = a
  if (tpl === 'animal') {
    const [, fur, ear, muzzle] = a
    const dk = lerpColor(fur, 0x000000, 0.22)
    // Fjäderfä: näbb i stället för nos, ingen mule och ingen mun-båge.
    const bird = ear === 'bill' || ear === 'comb' || ear === 'rooster'
    if (ear === 'mane') g.circle(0, 0, 44 * S).fill(sphereFill(0xd9922b))
    if (ear === 'wool') {
      // Fåret läses på ullkransen bakom huvudet, inte på ansiktet.
      for (const [wx, wy] of [[-30, -20], [-11, -34], [11, -34], [30, -20], [-36, 2], [36, 2]]) {
        g.circle(wx * S, wy * S, 15 * S).fill(sphereFill(0xfffdf8, { dark: 0.14 })).stroke({ width: 3, color: 0xd9d2c6 })
      }
    }
    if (bird && ear !== 'bill') {
      // Sammanhängande röd kam som SITTER på huvudet (tuppens är högre och bredare).
      const r = (ear === 'rooster' ? 12 : 8.5) * S
      const base = -30 * S
      g.roundRect(-r * 2.4, base - r * 0.6, r * 4.8, r * 1.4, r * 0.5).fill(0xe0392b)
      for (let i = -1; i <= 1; i++) g.circle(i * r * 1.55, base - r * 0.9, r).fill(0xe0392b)
    }
    if (ear === 'bill') {
      // Liten tofs så ankan inte bara är en tom cirkel med näbb.
      for (const [tx, ty] of [[-9, -34], [3, -38], [13, -32]]) {
        g.circle(tx * S, ty * S, 9 * S).fill(fur).stroke({ width: 3, color: dk })
      }
    }
    if (ear === 'cow') {
      // Horn ovanför öronen, breda öron rakt ut åt sidorna.
      g.ellipse(-30 * S, -36 * S, 9 * S, 12 * S).fill(0xf0dfc0).stroke({ width: 3, color: 0xc9b48a })
      g.ellipse(30 * S, -36 * S, 9 * S, 12 * S).fill(0xf0dfc0).stroke({ width: 3, color: 0xc9b48a })
      g.ellipse(-40 * S, -12 * S, 15 * S, 10 * S).fill(fur).stroke({ width: 3, color: dk })
      g.ellipse(40 * S, -12 * S, 15 * S, 10 * S).fill(fur).stroke({ width: 3, color: dk })
    }
    if (ear === 'long') {
      g.ellipse(-14 * S, -46 * S, 9 * S, 26 * S).fill(fur).stroke({ width: 3, color: dk })
      g.ellipse(14 * S, -46 * S, 9 * S, 26 * S).fill(fur).stroke({ width: 3, color: dk })
    } else if (ear === 'point' || ear === 'horse') {
      g.moveTo(-30 * S, -18 * S).lineTo(-24 * S, -48 * S).lineTo(-6 * S, -26 * S).closePath().fill(fur).stroke({ width: 3, color: dk })
      g.moveTo(30 * S, -18 * S).lineTo(24 * S, -48 * S).lineTo(6 * S, -26 * S).closePath().fill(fur).stroke({ width: 3, color: dk })
    } else if (ear === 'wool') {
      g.ellipse(-40 * S, 6 * S, 14 * S, 9 * S).fill(dk)
      g.ellipse(40 * S, 6 * S, 14 * S, 9 * S).fill(dk)
    } else if (ear === 'flop') {
      g.ellipse(-32 * S, -6 * S, 12 * S, 24 * S).fill(dk)
      g.ellipse(32 * S, -6 * S, 12 * S, 24 * S).fill(dk)
    } else if (ear === 'panda') {
      g.circle(-26 * S, -28 * S, 13 * S).fill(0x2b2b2b)
      g.circle(26 * S, -28 * S, 13 * S).fill(0x2b2b2b)
    } else if (ear !== 'beak' && ear !== 'eyes' && ear !== 'cow' && !bird) {
      g.circle(-26 * S, -26 * S, 13 * S).fill(fur).stroke({ width: 3, color: dk })
      g.circle(26 * S, -26 * S, 13 * S).fill(fur).stroke({ width: 3, color: dk })
    }
    if (ear === 'eyes') {
      g.circle(-17 * S, -30 * S, 14 * S).fill(fur).stroke({ width: 3, color: dk })
      g.circle(17 * S, -30 * S, 14 * S).fill(fur).stroke({ width: 3, color: dk })
      g.circle(-17 * S, -30 * S, 6 * S).fill(0x2b2b2b)
      g.circle(17 * S, -30 * S, 6 * S).fill(0x2b2b2b)
    }
    // Huvudet bär sin volym på gradienten ensam. Två accenter provades här och ströks efter
    // att ha granskats i skärmdump, båda för att de läste som FEL sak:
    //   · pälstofsar (cirklar som stack ut ur silhuetten) blev bubblor med egen kontur på
    //     kanin, panda och pingvin — bra bara på räv och hund.
    //   · kantdager som en ljus båge innanför konturen såg mjuk ut vid 130px men var ett
    //     hårt streck tvärs över pannan vid 300px (`_ikoner.mjs --size 300`). En dager
    //     med hård kant är per definition inte en dager; den hör hemma i gradienten.
    g.circle(0, 0, 34 * S).fill(sphereFill(fur)).stroke({ width: 4, color: dk })
    if (ear === 'horse') {
      g.ellipse(0, 27 * S, 17 * S, 22 * S).fill(muzzle).stroke({ width: 4, color: dk })
      // Man + lugg ritas OVANPÅ huvudet, annars blir den bara en taggig sky bakom.
      const mane = lerpColor(fur, 0x000000, 0.45)
      g.moveTo(-33 * S, -12 * S).quadraticCurveTo(-30 * S, -34 * S, -10 * S, -33 * S)
      g.quadraticCurveTo(-20 * S, -22 * S, -20 * S, -4 * S).closePath().fill(mane)
      g.moveTo(-8 * S, -33 * S).quadraticCurveTo(4 * S, -22 * S, -2 * S, -12 * S)
      g.quadraticCurveTo(10 * S, -24 * S, 8 * S, -34 * S).closePath().fill(mane)
    } else if (ear === 'cow') {
      // Fläck (det som gör en vit cirkel till en ko) + stor mule med näsborrar.
      g.circle(-19 * S, -16 * S, 13 * S).fill(0x6f6257)
      g.ellipse(0, 17 * S, 23 * S, 16 * S).fill(muzzle).stroke({ width: 3, color: lerpColor(muzzle, 0x000000, 0.25) })
    } else if (!bird) g.ellipse(0, 14 * S, 19 * S, 14 * S).fill(muzzle)
    if (ear === 'panda') {
      g.ellipse(-13 * S, -6 * S, 10 * S, 12 * S).fill(0x2b2b2b)
      g.ellipse(13 * S, -6 * S, 10 * S, 12 * S).fill(0x2b2b2b)
    }
    if (ear !== 'eyes') {
      g.circle(-12 * S, -6 * S, 5 * S).fill(0x2b2b2b)
      g.circle(12 * S, -6 * S, 5 * S).fill(0x2b2b2b)
    }
    if (ear === 'beak') g.moveTo(-9 * S, 8 * S).lineTo(0, 20 * S).lineTo(9 * S, 8 * S).closePath().fill(0xff9d3d)
    else if (ear === 'bill') {
      // Ankans platta breda näbb — den enskilt tydligaste ank-signalen.
      g.ellipse(0, 18 * S, 25 * S, 11 * S).fill(0xff9d3d).stroke({ width: 3, color: 0xd97a22 })
      g.moveTo(-17 * S, 18 * S).lineTo(17 * S, 18 * S).stroke({ width: 2, color: 0xd97a22, alpha: 0.6 })
      g.circle(-7 * S, 13 * S, 2 * S).fill(0xd97a22)
      g.circle(7 * S, 13 * S, 2 * S).fill(0xd97a22)
    } else if (bird) {
      g.moveTo(-8 * S, 8 * S).lineTo(0, 21 * S).lineTo(8 * S, 8 * S).closePath().fill(0xffb03a)
      g.circle(0, 27 * S, 7 * S).fill(0xe0392b) // slör
    } else if (ear === 'horse') {
      g.ellipse(-7 * S, 31 * S, 4 * S, 5 * S).fill(0x3a2a1e)
      g.ellipse(7 * S, 31 * S, 4 * S, 5 * S).fill(0x3a2a1e)
    } else if (ear === 'cow') {
      g.ellipse(-8 * S, 14 * S, 4.5 * S, 6 * S).fill(0xc4647c)
      g.ellipse(8 * S, 14 * S, 4.5 * S, 6 * S).fill(0xc4647c)
    } else if (ear === 'pig') {
      g.ellipse(0, 12 * S, 13 * S, 10 * S).fill(0xef8fa4)
      g.circle(-5 * S, 12 * S, 3 * S).fill(0xc4647c)
      g.circle(5 * S, 12 * S, 3 * S).fill(0xc4647c)
    } else g.ellipse(0, 8 * S, 7 * S, 5 * S).fill(0x2b2b2b)
    if (!bird && ear !== 'horse' && ear !== 'cow') {
      g.arc(-5 * S, 18 * S, 6 * S, 0, Math.PI).arc(5 * S, 18 * S, 6 * S, 0, Math.PI).stroke({ width: 3, color: dk })
    }
  } else if (tpl === 'fruit') {
    const [, shape, col, leaf] = a
    const dk = lerpColor(col, 0x000000, 0.2)
    if (shape === 'drop') {
      g.moveTo(0, -34 * S).quadraticCurveTo(26 * S, -4 * S, 26 * S, 8 * S)
      g.arc(0, 8 * S, 26 * S, 0, Math.PI).quadraticCurveTo(-26 * S, -4 * S, 0, -34 * S)
      g.fill(sphereFill(col, { lightY: 0.42 })).stroke({ width: 4, color: dk })
    } else if (shape === 'crescent') {
      g.moveTo(-36 * S, -14 * S).quadraticCurveTo(-6 * S, 34 * S, 36 * S, 12 * S).quadraticCurveTo(6 * S, 22 * S, -24 * S, -18 * S).closePath()
      g.fill(cylinderFill(col, { axis: 'x' })).stroke({ width: 4, color: dk })
    } else if (shape === 'bunch') {
      for (const [bx, by] of [[-16, -8], [0, -14], [16, -8], [-8, 8], [8, 8], [0, 26]]) g.circle(bx * S, by * S, 13 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
    } else if (shape === 'pear') {
      // ETT slutet drag, inte cirkel + ellips. Två stroke:ade former som överlappar visar
      // sömmen där de möts, och päronet läste som en snögubbe (syntes först i skärmdump).
      g.moveTo(0, -34 * S).quadraticCurveTo(16 * S, -31 * S, 15 * S, -9 * S)
      g.quadraticCurveTo(14 * S, 5 * S, 26 * S, 17 * S).quadraticCurveTo(31 * S, 41 * S, 0, 41 * S)
      g.quadraticCurveTo(-31 * S, 41 * S, -26 * S, 17 * S).quadraticCurveTo(-14 * S, 5 * S, -15 * S, -9 * S)
      g.quadraticCurveTo(-16 * S, -31 * S, 0, -34 * S).closePath()
      g.fill(sphereFill(col, { lightY: 0.38 })).stroke({ width: 4, color: dk })
      g.roundRect(-2.5 * S, -46 * S, 5 * S, 15 * S, 2.5 * S).fill(0x6f4a2e)
      g.ellipse(13 * S, -41 * S, 12 * S, 7 * S).fill(leaf)
    } else if (shape === 'cherry') {
      g.circle(-16 * S, 18 * S, 16 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
      g.circle(16 * S, 22 * S, 16 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
      g.moveTo(-16 * S, 4 * S).quadraticCurveTo(0, -26 * S, 16 * S, 8 * S).stroke({ width: 4, color: leaf })
    } else if (shape === 'slice') {
      g.moveTo(-38 * S, -18 * S).arc(0, -18 * S, 38 * S, Math.PI, 0, true).closePath().fill(topLightFill(col)).stroke({ width: 4, color: dk })
      g.moveTo(-38 * S, -18 * S).arc(0, -18 * S, 38 * S, Math.PI, 0, true).stroke({ width: 8 * S, color: 0x5bbf6a })
      for (const sx of [-18, 0, 18]) g.circle(sx * S, 2 * S, 3 * S).fill(0x2b2b2b)
    } else if (shape === 'kiwi') {
      g.circle(0, 0, 32 * S).fill(sphereFill(0x8a6a4a)).stroke({ width: 4, color: 0x6f4a2e })
      g.circle(0, 0, 25 * S).fill(col)
      g.circle(0, 0, 9 * S).fill(0xfff0d8)
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2
        g.circle(Math.cos(ang) * 16 * S, Math.sin(ang) * 16 * S, 2.5 * S).fill(0x2b2b2b)
      }
    } else if (shape === 'coco') {
      g.circle(0, 0, 32 * S).fill(sphereFill(col)).stroke({ width: 4, color: 0x6f4a2e })
      g.circle(-10 * S, -8 * S, 5 * S).fill(0x5c3720)
      g.circle(6 * S, -12 * S, 5 * S).fill(0x5c3720)
      g.arc(0, 6 * S, 20 * S, Math.PI, 0).fill(0xfff0e8)
    } else if (shape === 'pine') {
      g.ellipse(0, 12 * S, 24 * S, 30 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      for (let r = -14; r <= 30; r += 11) g.moveTo(-22 * S, r * S).lineTo(22 * S, r * S).stroke({ width: 2, color: dk, alpha: 0.6 })
      for (const dx of [-14, 0, 14]) g.moveTo(0, -14 * S).quadraticCurveTo(dx * S, -34 * S, dx * 1.4 * S, -44 * S).stroke({ width: 6 * S, color: leaf, cap: 'round' })
    } else if (shape === 'berry') {
      g.moveTo(-26 * S, -8 * S).quadraticCurveTo(-30 * S, 30 * S, 0, 38 * S).quadraticCurveTo(30 * S, 30 * S, 26 * S, -8 * S).closePath()
      g.fill(sphereFill(col, { lightY: 0.34 })).stroke({ width: 4, color: dk })
      for (const [sx, sy] of [[-11, 4], [8, 0], [-3, 16], [13, 16]]) g.ellipse(sx * S, sy * S, 2.4 * S, 4 * S).fill(0xffe08a)
      for (const dx of [-16, 0, 16]) g.ellipse(dx * S, -13 * S, 11 * S, 7 * S).fill(leaf)
    } else {
      g.circle(0, 4 * S, 30 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      // Strukturaccent: porer i skalet. Ljusare än frukten och glesa — tätt placerade
      // läser de som smuts i stället för yta.
      if (accent) for (const [px, py] of [[-13, 14], [6, 20], [15, 0], [-6, -6]]) {
        g.circle(px * S, py * S, 1.6 * S).fill({ color: 0xffffff, alpha: 0.35 })
      }
      g.roundRect(-3 * S, -34 * S, 6 * S, 14 * S, 3 * S).fill(0x6f4a2e)
      g.ellipse(14 * S, -30 * S, 13 * S, 8 * S).fill(leaf)
    }
  } else if (tpl === 'vehicle') {
    const [, col, top] = a
    const dk = lerpColor(col, 0x000000, 0.25)
    // Ett däck är matt gummi, inte lack: svag dager, tydlig kantmörkning. Samma instans
    // återanvänds av alla hjul i alla fordon (form.js cachar per färg+opts).
    const tyre = sphereFill(0x3a3a3a, { highlight: 0.3, dark: 0.35 })
    if (top === 'bike') {
      g.circle(-24 * S, 16 * S, 18 * S).stroke({ width: 5, color: dk })
      g.circle(24 * S, 16 * S, 18 * S).stroke({ width: 5, color: dk })
      g.moveTo(-24 * S, 16 * S).lineTo(-4 * S, -12 * S).lineTo(24 * S, 16 * S).moveTo(-4 * S, -12 * S).lineTo(10 * S, -12 * S)
      g.stroke({ width: 5, color: 0xe0392b })
    } else if (top === 'heli') {
      g.ellipse(-4 * S, 6 * S, 30 * S, 20 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.moveTo(22 * S, 4 * S).lineTo(46 * S, -4 * S).lineTo(46 * S, 8 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-44 * S, -22 * S).lineTo(36 * S, -22 * S).stroke({ width: 6, color: 0x74695f })
      g.roundRect(-6 * S, -26 * S, 8 * S, 12 * S, 3 * S).fill(0x74695f)
      g.circle(-14 * S, 2 * S, 10 * S).fill({ color: 0xd8f0ff, alpha: 0.9 })
    } else if (top === 'rocket') {
      g.moveTo(0, -46 * S).quadraticCurveTo(20 * S, -10 * S, 16 * S, 24 * S).lineTo(-16 * S, 24 * S).quadraticCurveTo(-20 * S, -10 * S, 0, -46 * S)
      g.fill(cylinderFill(col)).stroke({ width: 4, color: 0x9aa4b0 })
      g.moveTo(-16 * S, 8 * S).lineTo(-32 * S, 32 * S).lineTo(-16 * S, 26 * S).closePath().fill(0xe0392b)
      g.moveTo(16 * S, 8 * S).lineTo(32 * S, 32 * S).lineTo(16 * S, 26 * S).closePath().fill(0xe0392b)
      g.circle(0, -12 * S, 10 * S).fill(0x6ad0ff).stroke({ width: 3, color: 0x2f7fb8 })
      g.moveTo(-10 * S, 26 * S).lineTo(0, 46 * S).lineTo(10 * S, 26 * S).closePath().fill(0xff9d3d)
    } else if (top === 'boat') {
      g.moveTo(-38 * S, 12 * S).lineTo(38 * S, 12 * S).lineTo(26 * S, 34 * S).lineTo(-26 * S, 34 * S).closePath()
      g.fill(topLightFill(col)).stroke({ width: 4, color: dk })
      g.roundRect(-3 * S, -40 * S, 6 * S, 52 * S, 3 * S).fill(cylinderFill(0x8a5a3b))
      g.moveTo(4 * S, -38 * S).lineTo(32 * S, 8 * S).lineTo(4 * S, 8 * S).closePath().fill(0xfff0d8).stroke({ width: 3, color: 0xe0c9a8 })
    } else if (top === 'train') {
      g.roundRect(-38 * S, -14 * S, 76 * S, 34 * S, 6 * S).fill(topLightFill(col)).stroke({ width: 4, color: dk })
      g.roundRect(-34 * S, -38 * S, 30 * S, 26 * S, 5 * S).fill(topLightFill(col)).stroke({ width: 4, color: dk })
      g.roundRect(14 * S, -44 * S, 12 * S, 16 * S, 4 * S).fill(0x3a3a3a)
      g.roundRect(-30 * S, -32 * S, 20 * S, 14 * S, 3 * S).fill(0xd8f0ff)
      for (const wx of [-24, 0, 24]) g.circle(wx * S, 24 * S, 11 * S).fill(tyre).stroke({ width: 3, color: 0x1c1c1c })
    } else {
      const isBus = top === 'bus' || top === 'big'
      g.roundRect(-40 * S, -6 * S, 80 * S, isBus ? 34 * S : 26 * S, 9 * S).fill(topLightFill(col)).stroke({ width: 4, color: dk })
      if (top === 'ladder') g.roundRect(-30 * S, -18 * S, 60 * S, 8 * S, 3 * S).fill(0xc3ccd4)
      g.moveTo(-26 * S, -6 * S).lineTo(-16 * S, -30 * S).lineTo(20 * S, -30 * S).lineTo(30 * S, -6 * S).closePath()
      g.fill(topLightFill(lerpColor(col, 0xffffff, 0.25))).stroke({ width: 4, color: dk })
      g.roundRect(-14 * S, -26 * S, 13 * S, 16 * S, 3 * S).fill(0xd8f0ff)
      g.roundRect(3 * S, -26 * S, 13 * S, 16 * S, 3 * S).fill(0xd8f0ff)
      if (top === 'big') {
        g.circle(-22 * S, 30 * S, 16 * S).fill(tyre).stroke({ width: 3, color: 0x1c1c1c })
        g.circle(24 * S, 32 * S, 10 * S).fill(tyre).stroke({ width: 3, color: 0x1c1c1c })
      } else {
        g.circle(-22 * S, 28 * S, 11 * S).fill(tyre).stroke({ width: 3, color: 0x1c1c1c })
        g.circle(22 * S, 28 * S, 11 * S).fill(tyre).stroke({ width: 3, color: 0x1c1c1c })
      }
    }
  } else if (tpl === 'shape') {
    const [, shape, col] = a
    const dk = lerpColor(col, 0x000000, 0.25)
    if (shape === 'star' || shape === 'gem') {
      if (shape === 'gem') {
        g.moveTo(-32 * S, -8 * S).lineTo(-17 * S, -28 * S).lineTo(17 * S, -28 * S).lineTo(32 * S, -8 * S).lineTo(0, 32 * S).closePath()
        g.fill(topLightFill(col, { highlight: 0.4 })).stroke({ width: 4, color: dk })
        g.moveTo(-17 * S, -28 * S).lineTo(-8 * S, -8 * S).lineTo(0, -28 * S).closePath().fill({ color: 0xffffff, alpha: 0.5 })
      } else {
        const pts = []
        for (let k = 0; k < 10; k++) {
          const ang = (k / 10) * Math.PI * 2 - Math.PI / 2
          const rr = (k % 2 === 0 ? 36 : 15) * S
          pts.push(Math.cos(ang) * rr, Math.sin(ang) * rr)
        }
        g.poly(pts).fill(topLightFill(col)).stroke({ width: 4, color: dk })
      }
    } else if (shape === 'heart') {
      g.moveTo(0, 32 * S).quadraticCurveTo(-40 * S, 2 * S, -20 * S, -20 * S).quadraticCurveTo(-4 * S, -30 * S, 0, -10 * S)
      g.quadraticCurveTo(4 * S, -30 * S, 20 * S, -20 * S).quadraticCurveTo(40 * S, 2 * S, 0, 32 * S).closePath()
      g.fill(sphereFill(col, { lightY: 0.28 })).stroke({ width: 4, color: dk })
    } else if (shape === 'diamond') {
      g.poly([0, -34 * S, 30 * S, 0, 0, 34 * S, -30 * S, 0]).fill(topLightFill(col)).stroke({ width: 4, color: dk })
    } else if (shape === 'triangle') {
      g.poly([0, -32 * S, 32 * S, 26 * S, -32 * S, 26 * S]).fill(topLightFill(col)).stroke({ width: 4, color: dk })
    } else if (shape === 'moon') {
      // Skäran är RITAD som ett eget slutet drag. Förut låg en cream-cirkel ovanpå en hel
      // måne — osynlig bara mot cream bakgrund, en beige klump mot alla andra. `.cut()`
      // provades som ersättning och gick inte: GraphicsContext.cut() bryter efter FÖRSTA
      // instruktionen som saknar hål, så med `.fill().stroke()` fastnar hålet på konturen
      // och fyllningen förblir hel — resultatet blev en ring ovanpå en solid disk.
      // Ett eget drag har inga sådana beroenden och får en riktig kant hela vägen runt.
      g.moveTo(7 * S, -32 * S).quadraticCurveTo(-33 * S, -23 * S, -33 * S, 2 * S)
      g.quadraticCurveTo(-33 * S, 29 * S, 7 * S, 33 * S)
      g.quadraticCurveTo(-13 * S, 16 * S, -13 * S, 0)
      g.quadraticCurveTo(-13 * S, -16 * S, 7 * S, -32 * S).closePath()
      g.fill(sphereFill(col, { lightX: 0.3, spread: 0.66 })).stroke({ width: 4, color: dk })
    } else if (shape === 'flower') {
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.ellipse(Math.cos(ang) * 20 * S, Math.sin(ang) * 20 * S, 14 * S, 14 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
      }
      g.circle(0, 0, 11 * S).fill(sphereFill(0xffe08a)).stroke({ width: 3, color: 0xe0a94f })
    } else if (shape === 'paw') {
      g.ellipse(0, 12 * S, 20 * S, 17 * S).fill(col)
      for (const [tx, ty] of [[-22, -12], [-8, -24], [8, -24], [22, -12]]) g.circle(tx * S, ty * S, 8 * S).fill(col)
    } else if (shape === 'leaf') {
      g.moveTo(-26 * S, 22 * S).quadraticCurveTo(-16 * S, -26 * S, 26 * S, -22 * S)
      g.quadraticCurveTo(22 * S, 20 * S, -26 * S, 22 * S).closePath().fill(col)
      g.moveTo(-22 * S, 18 * S).quadraticCurveTo(2 * S, 2 * S, 22 * S, -18 * S).stroke({ width: 3, color: dk, alpha: 0.5 })
    } else if (shape === 'sparkle') {
      for (const [sx, sy, r] of [[0, 0, 26], [-22, 18, 12], [22, -18, 10]]) {
        g.moveTo(sx * S, (sy - r) * S).quadraticCurveTo(sx * S, sy * S, (sx + r * 0.45) * S, sy * S)
        g.quadraticCurveTo(sx * S, sy * S, sx * S, (sy + r) * S)
        g.quadraticCurveTo(sx * S, sy * S, (sx - r * 0.45) * S, sy * S)
        g.quadraticCurveTo(sx * S, sy * S, sx * S, (sy - r) * S).closePath().fill(col)
      }
    } else if (shape === 'rainbow') {
      const cols = [0xe0392b, 0xff9d3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
      cols.forEach((c, i) => g.arc(0, 24 * S, (42 - i * 6) * S, Math.PI, 0).stroke({ width: 6, color: c }))
      g.circle(-40 * S, 26 * S, 11 * S).fill(0xffffff)
      g.circle(40 * S, 26 * S, 11 * S).fill(0xffffff)
    } else if (shape === 'ball') {
      g.circle(0, 0, 34 * S).fill(sphereFill(col)).stroke({ width: 4, color: 0x3a3a3a })
      g.poly([0, -16 * S, 15 * S, -5 * S, 9 * S, 13 * S, -9 * S, 13 * S, -15 * S, -5 * S]).fill(0x2b2b2b)
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.circle(Math.cos(ang) * 30 * S, Math.sin(ang) * 30 * S, 7 * S).fill(0x2b2b2b)
      }
    } else if (shape === 'cloud') {
      // Basplattan ritas FÖRST och puffarna ovanpå. Omvänd ordning (som förut) lät en
      // gradientfylld platta lägga sig som ett band tvärs över molnets underkant.
      // Samma parametrar som CLOUD_FILL i scene.js → samma cachade instans, ett moln
      // i ett spel ser ut som ett moln i himlen.
      const puff = sphereFill(col, { lightY: 0.2, spread: 0.62, dark: 0.14 })
      g.roundRect(-36 * S, 2 * S, 72 * S, 22 * S, 11 * S).fill(topLightFill(col, { dark: 0.14 }))
      g.circle(-20 * S, 6 * S, 18 * S).fill(puff)
      g.circle(24 * S, 6 * S, 18 * S).fill(puff)
      g.circle(2 * S, -8 * S, 24 * S).fill(puff)
    } else if (shape === 'raincloud') {
      for (const [dx, dy] of [[-20, 26], [0, 34], [20, 26]]) {
        g.moveTo(dx * S, (dy - 12) * S).quadraticCurveTo((dx + 8) * S, (dy + 2) * S, dx * S, (dy + 8) * S)
        g.quadraticCurveTo((dx - 8) * S, (dy + 2) * S, dx * S, (dy - 12) * S).closePath().fill(0x6ab0e0)
      }
      const rpuff = sphereFill(col, { lightY: 0.2, spread: 0.62, dark: 0.18 })
      g.roundRect(-36 * S, -6 * S, 72 * S, 22 * S, 11 * S).fill(topLightFill(col, { dark: 0.18 }))
      g.circle(-20 * S, -2 * S, 18 * S).fill(rpuff)
      g.circle(24 * S, -2 * S, 18 * S).fill(rpuff)
      g.circle(2 * S, -16 * S, 24 * S).fill(rpuff)
      g.roundRect(-32 * S, 8 * S, 64 * S, 8 * S, 4 * S).fill({ color: dk, alpha: 0.35 })
    } else if (shape === 'snowflake') {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2
        const cx = Math.cos(ang), cy = Math.sin(ang)
        g.moveTo(0, 0).lineTo(cx * 36 * S, cy * 36 * S).stroke({ width: 7, color: col, cap: 'round' })
        // grenar
        for (const t of [0.5, 0.78]) {
          const bx = cx * 36 * t * S, by = cy * 36 * t * S
          for (const s2 of [-0.5, 0.5]) {
            const ba = ang + s2
            g.moveTo(bx, by).lineTo(bx + Math.cos(ba) * 12 * S, by + Math.sin(ba) * 12 * S)
            g.stroke({ width: 5, color: col, cap: 'round' })
          }
        }
      }
      g.circle(0, 0, 8 * S).fill(0xffffff).stroke({ width: 4, color: col })
    } else if (shape === 'bubbles') {
      for (const [bx, by, br] of [[-14, 10, 16], [12, -4, 20], [22, 22, 11], [-22, -16, 10]]) {
        g.circle(bx * S, by * S, br * S).fill({ color: col, alpha: 0.55 }).stroke({ width: 3, color: 0xffffff, alpha: 0.85 })
        g.circle((bx - br * 0.35) * S, (by - br * 0.35) * S, br * 0.28 * S).fill({ color: 0xffffff, alpha: 0.8 })
      }
    } else if (shape === 'sun') {
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2
        g.moveTo(Math.cos(ang) * 24 * S, Math.sin(ang) * 24 * S).lineTo(Math.cos(ang) * 36 * S, Math.sin(ang) * 36 * S)
        g.stroke({ width: 6, color: lerpColor(col, 0x000000, 0.15), cap: 'round' })
      }
      g.circle(0, 0, 24 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
    } else if (shape === 'clover') {
      for (const [cx, cy] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) g.circle(cx * S, cy * S, 15 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
      g.moveTo(0, 10 * S).quadraticCurveTo(8 * S, 30 * S, 0, 38 * S).stroke({ width: 4, color: dk })
    } else {
      g.circle(0, 0, 32 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
    }
  } else if (tpl === 'wear') {
    const [, form, col, acc] = a
    const dk = lerpColor(col, 0x000000, 0.28)
    const ad = lerpColor(acc, 0x000000, 0.22)
    // Tyg är matt: mindre dager än lack, men fortfarande ljus överkant och mörkad fåll.
    const tyg = topLightFill(col, { highlight: 0.22, dark: 0.22 })
    if (form === 'sunhat') {
      g.ellipse(0, 14 * S, 46 * S, 15 * S).fill(tyg).stroke({ width: 4, color: dk })
      g.moveTo(-24 * S, 15 * S).quadraticCurveTo(-22 * S, -28 * S, 0, -28 * S)
      g.quadraticCurveTo(22 * S, -28 * S, 24 * S, 15 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      g.roundRect(-25 * S, 2 * S, 50 * S, 12 * S, 6 * S).fill(acc).stroke({ width: 3, color: ad })
    } else if (form === 'cap') {
      g.moveTo(-30 * S, 8 * S).quadraticCurveTo(-30 * S, -30 * S, 0, -30 * S)
      g.quadraticCurveTo(30 * S, -30 * S, 30 * S, 8 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      g.ellipse(26 * S, 10 * S, 26 * S, 9 * S).fill(dk)
      g.circle(0, -30 * S, 6 * S).fill(acc).stroke({ width: 3, color: ad })
    } else if (form === 'rainhat') {
      // Sydväst: brätte som viker NER i sidorna + hakband. Skiljer den från solhatten,
      // som har platt brätte och rosett.
      g.moveTo(-43 * S, 0).quadraticCurveTo(-41 * S, 20 * S, -20 * S, 19 * S).lineTo(20 * S, 19 * S)
      g.quadraticCurveTo(41 * S, 20 * S, 43 * S, 0).quadraticCurveTo(0, 12 * S, -43 * S, 0).closePath()
      g.fill(tyg).stroke({ width: 4, color: dk })
      g.moveTo(-27 * S, 6 * S).quadraticCurveTo(-26 * S, -28 * S, 0, -28 * S)
      g.quadraticCurveTo(26 * S, -28 * S, 27 * S, 6 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      g.roundRect(-27 * S, -6 * S, 54 * S, 10 * S, 5 * S).fill(acc)
      g.moveTo(-24 * S, 16 * S).quadraticCurveTo(0, 34 * S, 24 * S, 16 * S).stroke({ width: 4, color: ad })
    } else if (form === 'beanie') {
      g.circle(0, -32 * S, 11 * S).fill(acc).stroke({ width: 3, color: ad })
      g.moveTo(-30 * S, 12 * S).quadraticCurveTo(-30 * S, -22 * S, 0, -22 * S)
      g.quadraticCurveTo(30 * S, -22 * S, 30 * S, 12 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      for (const rx of [-16, 0, 16]) g.moveTo(rx * S, -20 * S).lineTo(rx * S, 12 * S).stroke({ width: 3, color: dk, alpha: 0.4 })
      g.roundRect(-33 * S, 8 * S, 66 * S, 17 * S, 8 * S).fill(topLightFill(acc, { highlight: 0.22, dark: 0.22 })).stroke({ width: 3, color: ad })
    } else if (form === 'shirt' || form === 'dress') {
      const dress = form === 'dress'
      g.moveTo(-17 * S, -26 * S).lineTo(-37 * S, -13 * S).lineTo(-27 * S, 3 * S).lineTo(-19 * S, -3 * S)
      if (dress) g.lineTo(-32 * S, 34 * S).lineTo(32 * S, 34 * S).lineTo(19 * S, -3 * S)
      else g.lineTo(-19 * S, 30 * S).lineTo(19 * S, 30 * S).lineTo(19 * S, -3 * S)
      g.lineTo(27 * S, 3 * S).lineTo(37 * S, -13 * S).lineTo(17 * S, -26 * S)
      g.quadraticCurveTo(0, -15 * S, -17 * S, -26 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      if (dress) g.roundRect(-19 * S, 0, 38 * S, 8 * S, 4 * S).fill(acc).stroke({ width: 2, color: ad })
      else g.moveTo(-11 * S, -21 * S).quadraticCurveTo(0, -11 * S, 11 * S, -21 * S).stroke({ width: 4, color: acc })
    } else if (form === 'coat' || form === 'puffer') {
      if (form === 'coat') {
        // Huvan måste synas OVANFÖR axlarna, annars är regnjackan bara en trapets.
        g.moveTo(-25 * S, -14 * S).quadraticCurveTo(0, -48 * S, 25 * S, -14 * S)
        g.quadraticCurveTo(0, -26 * S, -25 * S, -14 * S).closePath()
        g.fill(lerpColor(col, 0x000000, 0.17)).stroke({ width: 4, color: dk })
      }
      g.moveTo(-20 * S, -20 * S).lineTo(-37 * S, -6 * S).lineTo(-31 * S, 32 * S).lineTo(31 * S, 32 * S)
      g.lineTo(37 * S, -6 * S).lineTo(20 * S, -20 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      if (form === 'puffer') {
        for (const qy of [-6, 6, 18]) g.moveTo(-33 * S, qy * S).lineTo(33 * S, qy * S).stroke({ width: 3, color: dk, alpha: 0.45 })
        g.ellipse(0, -19 * S, 23 * S, 10 * S).fill(acc).stroke({ width: 3, color: ad })
      } else {
        g.moveTo(0, -16 * S).lineTo(0, 32 * S).stroke({ width: 4, color: acc })
        g.circle(-13 * S, 12 * S, 4 * S).fill(acc)
      }
    } else if (form === 'sandal') {
      // OVANIFRÅN, till skillnad från de andra skorna. Sidovy testades i två varianter
      // och läste båda som en bänk/korg — lösa remmar bredvid en sula binds inte ihop
      // av ögat. Y-remmen uppifrån är entydig även för en 2-åring.
      g.ellipse(0, 2 * S, 22 * S, 34 * S).fill(tyg).stroke({ width: 4, color: dk })
      g.ellipse(0, 2 * S, 15 * S, 27 * S).fill(lerpColor(col, 0xffffff, 0.28))
      g.moveTo(0, -15 * S).quadraticCurveTo(-11 * S, -4 * S, -16 * S, 9 * S).stroke({ width: 8, color: acc, cap: 'round' })
      g.moveTo(0, -15 * S).quadraticCurveTo(11 * S, -4 * S, 16 * S, 9 * S).stroke({ width: 8, color: acc, cap: 'round' })
      g.circle(0, -16 * S, 6 * S).fill(acc).stroke({ width: 3, color: ad })
    } else if (form === 'shoe') {
      g.moveTo(-34 * S, 18 * S).lineTo(-34 * S, -2 * S).quadraticCurveTo(-30 * S, -18 * S, -8 * S, -16 * S)
      g.lineTo(8 * S, 2 * S).quadraticCurveTo(30 * S, 6 * S, 34 * S, 18 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      g.roundRect(-37 * S, 16 * S, 74 * S, 12 * S, 6 * S).fill(acc).stroke({ width: 3, color: 0xc3ccd4 })
      for (let i = 0; i < 3; i++) g.moveTo((-24 + i * 9) * S, (-9 + i * 4) * S).lineTo((-14 + i * 9) * S, (-3 + i * 4) * S).stroke({ width: 3, color: acc })
    } else if (form === 'boot' || form === 'snowboot') {
      g.moveTo(-16 * S, -30 * S).lineTo(16 * S, -30 * S).lineTo(16 * S, 6 * S)
      g.quadraticCurveTo(20 * S, 13 * S, 34 * S, 15 * S).quadraticCurveTo(41 * S, 19 * S, 34 * S, 26 * S)
      g.lineTo(-16 * S, 26 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      if (form === 'snowboot') {
        for (const fx of [-14, -2, 10]) g.circle(fx * S, -28 * S, 10 * S).fill(acc).stroke({ width: 3, color: ad })
      } else {
        g.roundRect(-17 * S, -32 * S, 34 * S, 11 * S, 5 * S).fill(acc).stroke({ width: 3, color: ad })
      }
      g.roundRect(-17 * S, 24 * S, 53 * S, 8 * S, 4 * S).fill(dk)
    } else if (form === 'shades') {
      g.roundRect(-40 * S, -13 * S, 32 * S, 26 * S, 11 * S).fill(acc).stroke({ width: 5, color: col })
      g.roundRect(8 * S, -13 * S, 32 * S, 26 * S, 11 * S).fill(acc).stroke({ width: 5, color: col })
      g.moveTo(-8 * S, -5 * S).lineTo(8 * S, -5 * S).stroke({ width: 5, color: col })
      g.moveTo(-40 * S, -8 * S).lineTo(-50 * S, -16 * S).stroke({ width: 5, color: col, cap: 'round' })
      g.moveTo(40 * S, -8 * S).lineTo(50 * S, -16 * S).stroke({ width: 5, color: col, cap: 'round' })
      g.ellipse(-30 * S, -6 * S, 7 * S, 4 * S).fill({ color: 0xffffff, alpha: 0.5 })
    } else if (form === 'trunks') {
      g.moveTo(-30 * S, -14 * S).lineTo(30 * S, -14 * S).lineTo(30 * S, 20 * S).lineTo(7 * S, 20 * S)
      g.lineTo(0, -2 * S).lineTo(-7 * S, 20 * S).lineTo(-30 * S, 20 * S).closePath().fill(tyg).stroke({ width: 4, color: dk })
      g.roundRect(-31 * S, -17 * S, 62 * S, 10 * S, 5 * S).fill(acc).stroke({ width: 3, color: ad })
    } else {
      // scarf — band över axlarna + TVÅ hängande ändar. Ett enda band läste som rosett.
      g.roundRect(-21 * S, -8 * S, 17 * S, 40 * S, 7 * S).fill(cylinderFill(col, { dark: 0.24, highlight: 0.2 })).stroke({ width: 4, color: dk })
      g.roundRect(4 * S, -8 * S, 17 * S, 32 * S, 7 * S).fill(cylinderFill(col, { dark: 0.24, highlight: 0.2 })).stroke({ width: 4, color: dk })
      g.moveTo(-36 * S, -22 * S).quadraticCurveTo(0, -4 * S, 36 * S, -22 * S)
      g.quadraticCurveTo(36 * S, -10 * S, 36 * S, -8 * S).quadraticCurveTo(0, 10 * S, -36 * S, -8 * S)
      g.closePath().fill(tyg).stroke({ width: 4, color: dk })
      for (const [fx, fy] of [[-20, 26], [5, 18]]) {
        for (let i = 0; i < 3; i++) g.moveTo((fx + i * 6) * S, fy * S).lineTo((fx + i * 6) * S, (fy + 7) * S).stroke({ width: 3, color: acc })
      }
    }
  } else if (tpl === 'tool') {
    const [, form, col] = a
    const dk = lerpColor(col, 0x000000, 0.28)
    if (form === 'plane') {
      g.moveTo(-40 * S, 0).lineTo(30 * S, -10 * S).quadraticCurveTo(44 * S, -6 * S, 44 * S, 2 * S)
      g.lineTo(-40 * S, 12 * S).closePath().fill(cylinderFill(col, { axis: 'x' })).stroke({ width: 4, color: dk })
      g.moveTo(-6 * S, -6 * S).lineTo(-18 * S, -34 * S).lineTo(6 * S, -8 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-6 * S, 8 * S).lineTo(-18 * S, 32 * S).lineTo(6 * S, 8 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-40 * S, 0).lineTo(-50 * S, -14 * S).lineTo(-34 * S, -4 * S).closePath().fill(dk)
    } else if (form === 'hammer') {
      g.roundRect(-5 * S, -6 * S, 10 * S, 48 * S, 4 * S).fill(cylinderFill(col)).stroke({ width: 3, color: dk })
      g.roundRect(-30 * S, -30 * S, 60 * S, 24 * S, 5 * S).fill(cylinderFill(0x9aa4b0, { axis: 'x', highlight: 0.4 })).stroke({ width: 4, color: 0x6f7883 })
      g.roundRect(16 * S, -28 * S, 16 * S, 20 * S, 4 * S).fill(0x7b858f)
      // Strukturaccent: metalldager — en smal ljusstrimma tvärs över huvudet.
      if (accent) g.moveTo(-24 * S, -25 * S).lineTo(10 * S, -25 * S).stroke({ width: 3, color: 0xffffff, alpha: 0.45, cap: 'round' })
    } else if (form === 'scissors') {
      g.moveTo(-14 * S, 22 * S).lineTo(12 * S, -22 * S).stroke({ width: 6, color: col, cap: 'round' })
      g.moveTo(14 * S, 22 * S).lineTo(-12 * S, -22 * S).stroke({ width: 6, color: col, cap: 'round' })
      g.circle(-18 * S, 30 * S, 10 * S).stroke({ width: 5, color: 0xe0574f })
      g.circle(18 * S, 30 * S, 10 * S).stroke({ width: 5, color: 0xe0574f })
      g.circle(0, 2 * S, 4 * S).fill(0x6f7883)
    } else if (form === 'key') {
      g.circle(-18 * S, 0, 16 * S).stroke({ width: 9, color: col })
      g.roundRect(-4 * S, -5 * S, 42 * S, 10 * S, 5 * S).fill(cylinderFill(col, { axis: 'x', highlight: 0.4 }))
      g.roundRect(24 * S, 3 * S, 7 * S, 14 * S, 3 * S).fill(col)
      g.roundRect(34 * S, 3 * S, 7 * S, 10 * S, 3 * S).fill(col)
    } else if (form === 'brush') {
      g.roundRect(-5 * S, -34 * S, 10 * S, 44 * S, 4 * S).fill(cylinderFill(col)).stroke({ width: 3, color: dk })
      g.roundRect(-9 * S, 6 * S, 18 * S, 12 * S, 3 * S).fill(cylinderFill(0xc3ccd4, { highlight: 0.4 }))
      g.moveTo(-9 * S, 18 * S).lineTo(9 * S, 18 * S).lineTo(5 * S, 38 * S).lineTo(-5 * S, 38 * S).closePath().fill(0xa78bfa)
    } else if (form === 'spoon') {
      g.ellipse(0, -20 * S, 14 * S, 19 * S).fill(sphereFill(col, { highlight: 0.55, lightY: 0.34 })).stroke({ width: 4, color: dk })
      g.roundRect(-5 * S, -4 * S, 10 * S, 40 * S, 5 * S).fill(cylinderFill(col, { highlight: 0.4 })).stroke({ width: 3, color: dk })
    } else if (form === 'umbrella') {
      g.arc(0, 2 * S, 40 * S, Math.PI, 0).fill(topLightFill(col, { highlight: 0.34 })).stroke({ width: 4, color: dk })
      for (const dx of [-20, 0, 20]) g.moveTo(dx * S, 2 * S).lineTo(dx * S, -26 * S).stroke({ width: 3, color: dk, alpha: 0.5 })
      g.roundRect(-3 * S, 2 * S, 6 * S, 36 * S, 3 * S).fill(cylinderFill(0x8a5a3b))
      g.arc(-9 * S, 38 * S, 9 * S, 0, Math.PI).stroke({ width: 5, color: 0x8a5a3b })
    } else if (form === 'gift') {
      g.roundRect(-30 * S, -12 * S, 60 * S, 44 * S, 5 * S).fill(topLightFill(col)).stroke({ width: 4, color: dk })
      g.roundRect(-34 * S, -22 * S, 68 * S, 14 * S, 5 * S).fill(topLightFill(col)).stroke({ width: 4, color: dk })
      g.roundRect(-6 * S, -22 * S, 12 * S, 54 * S, 2 * S).fill(0xffd35c)
      g.moveTo(-4 * S, -22 * S).quadraticCurveTo(-26 * S, -44 * S, -14 * S, -22 * S).closePath().fill(0xffd35c)
      g.moveTo(4 * S, -22 * S).quadraticCurveTo(26 * S, -44 * S, 14 * S, -22 * S).closePath().fill(0xffd35c)
    } else if (form === 'icecream') {
      g.moveTo(-18 * S, 2 * S).lineTo(18 * S, 2 * S).lineTo(0, 40 * S).closePath().fill(topLightFill(0xd9a56b)).stroke({ width: 4, color: 0xa9714a })
      g.circle(-10 * S, -10 * S, 15 * S).fill(sphereFill(0xffb3d1))
      g.circle(10 * S, -10 * S, 15 * S).fill(sphereFill(0xfff0a8))
      g.circle(0, -26 * S, 15 * S).fill(sphereFill(0xc4b1ff)).stroke({ width: 3, color: 0xa78bfa })
    } else if (form === 'balloon') {
      g.moveTo(0, 26 * S).quadraticCurveTo(-10 * S, 40 * S, 5 * S, 50 * S).stroke({ width: 3, color: 0x8a8a8a })
      g.ellipse(0, -8 * S, 28 * S, 34 * S).fill(sphereFill(col, { lightY: 0.26, highlight: 0.55 })).stroke({ width: 4, color: dk })
      g.moveTo(-7 * S, 26 * S).lineTo(7 * S, 26 * S).lineTo(0, 34 * S).closePath().fill(dk)
    } else if (form === 'carrot') {
      g.moveTo(-16 * S, -10 * S).lineTo(16 * S, -10 * S).lineTo(0, 36 * S).closePath()
      g.fill(cylinderFill(col)).stroke({ width: 4, color: dk })
      for (const y of [-2, 8, 18]) g.moveTo((-9 + y * 0.2) * S, y * S).lineTo((9 - y * 0.2) * S, y * S).stroke({ width: 2.5, color: dk, alpha: 0.6 })
      for (const dx of [-11, 0, 11]) g.moveTo(0, -10 * S).quadraticCurveTo(dx * 0.6 * S, -24 * S, dx * S, -34 * S).stroke({ width: 6, color: 0x5bbf6a, cap: 'round' })
    } else if (form === 'candy') {
      g.ellipse(0, 0, 20 * S, 17 * S).fill(sphereFill(col, { highlight: 0.5 })).stroke({ width: 4, color: dk })
      g.moveTo(-18 * S, -4 * S).lineTo(-38 * S, -16 * S).lineTo(-34 * S, 0).lineTo(-38 * S, 16 * S).closePath().fill(topLightFill(col)).stroke({ width: 3, color: dk })
      g.moveTo(18 * S, -4 * S).lineTo(38 * S, -16 * S).lineTo(34 * S, 0).lineTo(38 * S, 16 * S).closePath().fill(topLightFill(col)).stroke({ width: 3, color: dk })
    } else if (form === 'butterfly') {
      g.ellipse(-18 * S, -12 * S, 18 * S, 21 * S).fill(topLightFill(col)).stroke({ width: 3, color: dk })
      g.ellipse(18 * S, -12 * S, 18 * S, 21 * S).fill(topLightFill(col)).stroke({ width: 3, color: dk })
      g.ellipse(-15 * S, 14 * S, 14 * S, 16 * S).fill(topLightFill(lerpColor(col, 0xffffff, 0.3))).stroke({ width: 3, color: dk })
      g.ellipse(15 * S, 14 * S, 14 * S, 16 * S).fill(topLightFill(lerpColor(col, 0xffffff, 0.3))).stroke({ width: 3, color: dk })
      g.roundRect(-4 * S, -22 * S, 8 * S, 44 * S, 4 * S).fill(cylinderFill(0x4a3728))
      g.moveTo(-3 * S, -22 * S).quadraticCurveTo(-11 * S, -36 * S, -17 * S, -33 * S).stroke({ width: 3, color: 0x4a3728 })
      g.moveTo(3 * S, -22 * S).quadraticCurveTo(11 * S, -36 * S, 17 * S, -33 * S).stroke({ width: 3, color: 0x4a3728 })
    } else if (form === 'tree') {
      g.roundRect(-8 * S, 8 * S, 16 * S, 36 * S, 4 * S).fill(cylinderFill(0x8a5a3b)).stroke({ width: 3, color: 0x6f4a2e })
      // Strukturaccent: barkstruktur — två korta ådror längs stammen.
      if (accent) for (const [gx, gy] of [[-2.5, 16], [3, 26]]) {
        g.moveTo(gx * S, gy * S).lineTo(gx * S, (gy + 9) * S).stroke({ width: 2, color: 0x6f4a2e, alpha: 0.55, cap: 'round' })
      }
      g.circle(-18 * S, -2 * S, 22 * S).fill(sphereFill(col))
      g.circle(18 * S, -2 * S, 22 * S).fill(sphereFill(col))
      g.circle(0, -24 * S, 26 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
    } else if (form === 'planet') {
      g.circle(0, 0, 26 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.ellipse(0, 4 * S, 44 * S, 11 * S).stroke({ width: 6, color: 0xffd35c })
    } else if (form === 'teddy') {
      g.circle(-26 * S, -24 * S, 12 * S).fill(dk)
      g.circle(26 * S, -24 * S, 12 * S).fill(dk)
      g.ellipse(0, 22 * S, 26 * S, 22 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.ellipse(0, 26 * S, 15 * S, 13 * S).fill(0xf0d7ae)
      g.circle(-28 * S, 16 * S, 10 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
      g.circle(28 * S, 16 * S, 10 * S).fill(sphereFill(col)).stroke({ width: 3, color: dk })
      g.circle(0, -14 * S, 24 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.ellipse(0, -6 * S, 11 * S, 9 * S).fill(0xf0d7ae)
      g.circle(-9 * S, -18 * S, 4 * S).fill(0x2b2b2b)
      g.circle(9 * S, -18 * S, 4 * S).fill(0x2b2b2b)
      g.ellipse(0, -8 * S, 5 * S, 4 * S).fill(0x4a3728)
    } else if (form === 'cookie') {
      g.circle(0, 0, 30 * S).fill(sphereFill(col, { spread: 0.6, dark: 0.24 })).stroke({ width: 4, color: dk })
      for (const [cx, cy] of [[-12, -10], [8, -14], [14, 6], [-6, 12], [-16, 6]]) g.circle(cx * S, cy * S, 4.5 * S).fill(0x5c3720)
      g.arc(-14 * S, -18 * S, 8 * S, 0.9 * Math.PI, 1.6 * Math.PI).stroke({ width: 3, color: dk, alpha: 0.5 })
    } else {
      // clock
      g.circle(0, 4 * S, 30 * S).fill(0xfff0d8).stroke({ width: 5, color: col })
      g.circle(-20 * S, -22 * S, 10 * S).fill(sphereFill(col))
      g.circle(20 * S, -22 * S, 10 * S).fill(sphereFill(col))
      g.roundRect(-4 * S, -14 * S, 8 * S, 20 * S, 3 * S).fill(0x3a3a3a)
      g.roundRect(0, 0, 20 * S, 7 * S, 3 * S).fill(0x3a3a3a)
      g.roundRect(-4 * S, 32 * S, 8 * S, 10 * S, 3 * S).fill(col)
    }
  } else {
    const [, col, form] = a
    const dk = lerpColor(col, 0x000000, 0.25)
    if (form === 'bee') {
      g.ellipse(-22 * S, -18 * S, 16 * S, 11 * S).fill({ color: 0xffffff, alpha: 0.7 }).stroke({ width: 2, color: 0xc3ccd4 })
      g.ellipse(22 * S, -18 * S, 16 * S, 11 * S).fill({ color: 0xffffff, alpha: 0.7 }).stroke({ width: 2, color: 0xc3ccd4 })
      g.ellipse(0, 4 * S, 26 * S, 22 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      for (const bx of [-10, 4, 18]) g.roundRect(bx * S, -14 * S, 8 * S, 36 * S, 2 * S).fill(0x3a3a3a)
      g.circle(-14 * S, -2 * S, 4 * S).fill(0x2b2b2b)
      g.moveTo(-16 * S, -20 * S).quadraticCurveTo(-22 * S, -34 * S, -14 * S, -34 * S).stroke({ width: 2.5, color: 0x2b2b2b })
    } else if (form === 'owl') {
      g.ellipse(0, 6 * S, 30 * S, 34 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.moveTo(-26 * S, -22 * S).lineTo(-18 * S, -42 * S).lineTo(-6 * S, -26 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.moveTo(26 * S, -22 * S).lineTo(18 * S, -42 * S).lineTo(6 * S, -26 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.circle(-13 * S, -10 * S, 13 * S).fill(0xfff0d8)
      g.circle(13 * S, -10 * S, 13 * S).fill(0xfff0d8)
      g.circle(-13 * S, -10 * S, 6 * S).fill(0x2b2b2b)
      g.circle(13 * S, -10 * S, 6 * S).fill(0x2b2b2b)
      g.moveTo(-6 * S, 4 * S).lineTo(0, 16 * S).lineTo(6 * S, 4 * S).closePath().fill(0xff9d3d)
    } else if (form === 'octo') {
      for (let i = 0; i < 5; i++) {
        const ox = (-24 + i * 12) * S
        g.moveTo(ox, 6 * S).quadraticCurveTo(ox - 6 * S, 26 * S, ox + 4 * S, 36 * S).stroke({ width: 7 * S, color: col, cap: 'round' })
      }
      g.ellipse(0, -8 * S, 28 * S, 26 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.circle(-10 * S, -12 * S, 5 * S).fill(0x2b2b2b)
      g.circle(10 * S, -12 * S, 5 * S).fill(0x2b2b2b)
    } else if (form === 'whale') {
      g.ellipse(-4 * S, 4 * S, 34 * S, 22 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.moveTo(26 * S, 2 * S).lineTo(44 * S, -14 * S).lineTo(44 * S, 18 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.ellipse(-6 * S, 12 * S, 22 * S, 10 * S).fill({ color: 0xffffff, alpha: 0.5 })
      g.circle(-18 * S, -2 * S, 4.5 * S).fill(0x2b2b2b)
      g.moveTo(-8 * S, -18 * S).quadraticCurveTo(-4 * S, -34 * S, 4 * S, -30 * S).stroke({ width: 4, color: 0xbfe6ff })
    } else if (form === 'crab') {
      g.ellipse(0, 6 * S, 32 * S, 22 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      for (const s2 of [-1, 1]) {
        g.moveTo(s2 * 30 * S, 0).quadraticCurveTo(s2 * 46 * S, -12 * S, s2 * 38 * S, -26 * S).stroke({ width: 6 * S, color: col })
        g.circle(s2 * 38 * S, -30 * S, 10 * S).fill(col).stroke({ width: 3, color: dk })
        for (let i = 0; i < 3; i++) g.moveTo(s2 * 24 * S, 14 * S + i * 8 * S).lineTo(s2 * 40 * S, 20 * S + i * 8 * S).stroke({ width: 4, color: col })
      }
      g.circle(-11 * S, -4 * S, 5 * S).fill(0xffffff)
      g.circle(11 * S, -4 * S, 5 * S).fill(0xffffff)
      g.circle(-11 * S, -4 * S, 2.5 * S).fill(0x2b2b2b)
      g.circle(11 * S, -4 * S, 2.5 * S).fill(0x2b2b2b)
    } else if (form === 'puffer') {
      g.circle(0, 0, 28 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2
        g.moveTo(Math.cos(ang) * 27 * S, Math.sin(ang) * 27 * S).lineTo(Math.cos(ang) * 40 * S, Math.sin(ang) * 40 * S)
        g.stroke({ width: 4, color: dk, cap: 'round' })
      }
      g.circle(-10 * S, -6 * S, 5 * S).fill(0x2b2b2b)
      g.circle(10 * S, -6 * S, 5 * S).fill(0x2b2b2b)
    } else if (form === 'turtle') {
      g.ellipse(-30 * S, 10 * S, 10 * S, 7 * S).fill(0x9bd88a)
      g.ellipse(30 * S, 10 * S, 10 * S, 7 * S).fill(0x9bd88a)
      g.circle(34 * S, -8 * S, 12 * S).fill(0x9bd88a).stroke({ width: 3, color: 0x3f8a44 })
      g.circle(38 * S, -10 * S, 3.5 * S).fill(0x2b2b2b)
      g.ellipse(0, 0, 32 * S, 26 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      for (const [hx, hy] of [[0, 0], [-16, -8], [16, -8], [-14, 10], [14, 10]]) g.circle(hx * S, hy * S, 8 * S).stroke({ width: 3, color: dk })
    } else if (form === 'shrimp') {
      g.moveTo(-30 * S, -6 * S).quadraticCurveTo(10 * S, -26 * S, 30 * S, 6 * S).quadraticCurveTo(6 * S, 30 * S, -26 * S, 12 * S).closePath()
      g.fill(cylinderFill(col, { axis: 'x' })).stroke({ width: 4, color: dk })
      g.moveTo(-26 * S, 2 * S).lineTo(-44 * S, -10 * S).lineTo(-42 * S, 12 * S).closePath().fill(col)
      g.circle(22 * S, 2 * S, 4 * S).fill(0x2b2b2b)
      g.moveTo(26 * S, -4 * S).lineTo(40 * S, -18 * S).stroke({ width: 3, color: dk })
    } else if (form === 'shell') {
      g.moveTo(-34 * S, 22 * S).arc(0, 22 * S, 34 * S, Math.PI, 0).closePath().fill(topLightFill(col)).stroke({ width: 4, color: dk })
      for (let i = 1; i < 5; i++) {
        const ang = Math.PI + (i / 5) * Math.PI
        g.moveTo(0, 22 * S).lineTo(Math.cos(ang) * 34 * S, 22 * S + Math.sin(ang) * 34 * S).stroke({ width: 3, color: dk, alpha: 0.7 })
      }
    } else if (form === 'jelly') {
      g.arc(0, 0, 30 * S, Math.PI, 0).fill(sphereFill(col, { lightY: 0.5 })).stroke({ width: 4, color: dk })
      g.roundRect(-30 * S, -2 * S, 60 * S, 8 * S, 4 * S).fill(col)
      for (const tx of [-20, -7, 7, 20]) {
        g.moveTo(tx * S, 6 * S).quadraticCurveTo(tx * S + 8 * S, 24 * S, tx * S - 4 * S, 38 * S).stroke({ width: 4, color: col, cap: 'round' })
      }
      g.circle(-10 * S, -12 * S, 4 * S).fill(0x2b2b2b)
      g.circle(10 * S, -12 * S, 4 * S).fill(0x2b2b2b)
    } else {
      g.ellipse(-2 * S, 0, 30 * S, 20 * S).fill(sphereFill(col)).stroke({ width: 4, color: dk })
      g.moveTo(24 * S, 0).lineTo(42 * S, -16 * S).lineTo(42 * S, 16 * S).closePath().fill(dk)
      g.moveTo(-6 * S, -18 * S).lineTo(4 * S, -32 * S).lineTo(12 * S, -16 * S).closePath().fill(dk)
      g.ellipse(-6 * S, 6 * S, 14 * S, 7 * S).fill({ color: 0xffffff, alpha: 0.3 })
      g.circle(-16 * S, -4 * S, 5 * S).fill(0xffffff)
      g.circle(-16 * S, -4 * S, 2.5 * S).fill(0x2b2b2b)
    }
  }
  g.eventMode = 'none'
  return g
}

