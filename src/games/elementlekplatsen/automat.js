// Sandlådans cellautomat — "falling sand" på ett rutnät av 16 px-celler.
//
// VARFÖR CELLER OCH INTE HUSETS SPH-VÄTSKA (lib/vatska.js):
// Vattnet här är inte bara vatten. Det ska FRYSA till is, koka bort till ånga, suga
// upp jord och bli lera, och släckas av en glödande sten. Alla sex reaktionerna i
// spelet är TILLSTÅNDSBYTEN HOS EN GRANNE — och en granne finns bara i ett rutnät.
// SPH-partiklar har ingen grannruta att byta tillstånd med, bara en tryckkraft, och
// `FluidWorld` känner inte till andra material än sitt eget. Att köra båda hade
// dessutom brutit motorregeln i skill fysik-spel ("ett spel = en motor"): två fasta
// tidssteg som driver samma bild ger skakningar som inte går att felsöka. Alltså:
// EN modell, cellautomaten, för allt som rinner, faller, brinner och fryser.
//
// Modulen är REN JS — ingen Pixi, ingen DOM. Den går att importera och stega i Node,
// vilket är precis vad `scripts/_elementprobe.mjs` gör i sin kontrollarm.
//
// TAKT: `steg()` körs 30 gånger i sekunden (var andra bildruta), inte 60. Alla
// sannolikheter nedan är per STEG vid den takten.

export const TOM = 0
export const JORD = 1
export const VATTEN = 2
export const IS = 3
export const ELD = 4
export const ANGA = 5
export const LERA = 6
export const GLOD = 7
export const STEN = 8
export const FRO = 9
export const ANTAL_MAT = 10

// Densitet avgör vad som sjunker genom vad. Ett material kan bara byta plats med ett
// LÄTTARE. Is och sten är låsta på 9 = ingenting tränger undan dem.
// FRÖET ligger med flit på samma tal som vattnet: det ska FLYTA, inte sjunka.
const TATHET = [0, 3, 2, 9, 0, 0, 3, 4, 9, 2]

// Faller och glider (pulver). Vatten hanteras för sig, gaser för sig.
const PULVER = [false, true, false, false, false, false, true, true, false, true]
// Vad vinden kan knuffa. Is och sten sitter fast — det är hela poängen med dem.
const LOS = [false, true, true, false, true, true, true, true, false, true]

// Livslängder i STEG (30 Hz). Ligger i en Uint8Array → taket är 255.
const ELD_LIV = [20, 40]
const ANGA_LIV = [60, 110]
const GLOD_LIV = [90, 170]

// Reaktionssannolikheter per steg och kontakt.
// De fem första är satta så att en reaktion syns inom en sekunds kontakt — P0-kravet
// "upptäckbar inom 10 sekunder" gäller barnets HELA väg fram till kontakten, så själva
// reaktionen måste vara snabbare än så. `ISVAX` är den enda som medvetet är långsam:
// isen ska VÄXA, inte smälla igen som en dörr (0,035/steg ≈ en cell per sekund).
const P = {
  LERA: 0.3, // vatten + jord → lera
  GLOD: 0.35, // eld + jord → glöd
  ANGA: 0.55, // eld + vatten → ånga
  SMALT: 0.45, // eld + is → vatten
  ISVAX: 0.035, // is + vatten → mer is
  TORKA: 0.1, // lera + eld → jord igen (motgången, se nedan)
  // Hur ofta en eldcell stiger ett steg. 0,35 var FÖR MYCKET: vid 30 Hz lyfte lågorna
  // ~10 celler i sekunden och slet sig loss från det de brann på — skärmdumpen av
  // "brasa" visade en svärm orange klossar svävande mitt i lådan, 200 px ovanför
  // härden. 0,14 ger ~4 celler/s, alltså lågor som hänger kvar över sitt bränsle
  // hela sin livstid (20–40 steg). Det ger också LÄNGRE kontakt med grannarna,
  // så reaktionerna blir om något tydligare.
  ELD_STIG: 0.14,
  ELD_ROK: 0.25, // andel eldceller som lämnar en pyrande ånga efter sig
  LERA_GLID: 0.12, // lera är klibbig och bygger brantare högar än jord
}

// TAK PÅ HUR MYCKET SOM KAN GÅ FEL SAMTIDIGT (P0 MOTGÅNG). Motgången i spelet är
// EMERGENT, inte skriptad: elden torkar tillbaka lera till jord, isen växer och kapslar
// in saker, glöd svalnar till sten mitt i högen. Alla tre går att måla sig runt direkt.
// Taken nedan är det som gör att de aldrig kan svälla till något barnet inte hinner med.
const TAK = { [ELD]: 300, [GLOD]: 260 }

export class Sandlada {
  constructor({ cols = 58, rows = 26, seed = 0 } = {}) {
    this.cols = cols
    this.rows = rows
    const n = cols * rows
    this.mat = new Uint8Array(n)
    this.liv = new Uint8Array(n) // nedräkning för eld/ånga/glöd
    this.v = new Uint8Array(n) // slumpad nyansvariant per cell (0–3), bara för bilden
    this.rord = new Uint8Array(n) // flyttad i det här steget → rör den inte igen
    this.antal = new Int32Array(ANTAL_MAT)
    this.antal[TOM] = n
    this.andrad = true // "bilden behöver ritas om"
    this.steget = 0
    this.groddar = [] // celler där ett frö grott (spelet planterar en blomma där)
    this.handelser = { anga: 0, smalt: 0, lera: 0, glod: 0, is: 0 }
    this._seed = (seed || (Math.random() * 0xffffffff)) >>> 0 || 12345
  }

  // xorshift32 — snabb OCH seedbar. Sonden kan köra exakt samma värld två gånger.
  _rnd() {
    let x = this._seed
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this._seed = x >>> 0
    return this._seed / 4294967296
  }

  idx(c, r) {
    return r * this.cols + c
  }

  // --- skrivning ------------------------------------------------------------
  // `_satt` sänder ALDRIG en upptäckt. Startvärldarna byggs med den, och en startvärld
  // som tände en ruta i bandet hade betytt att spelet klarar sig själv utan input
  // (scripts/_idleprobe.mjs ska ge 0). Upptäckter föds bara i `_reaktion`.
  _satt(i, m, liv = 0) {
    const gammal = this.mat[i]
    if (gammal === m) return false
    this.antal[gammal]--
    this.antal[m]++
    this.mat[i] = m
    this.liv[i] = liv
    this.v[i] = (this._rnd() * 4) | 0
    this.andrad = true
    return true
  }

  _byt(a, b) {
    const m = this.mat[a]
    this.mat[a] = this.mat[b]
    this.mat[b] = m
    const l = this.liv[a]
    this.liv[a] = this.liv[b]
    this.liv[b] = l
    const v = this.v[a]
    this.v[a] = this.v[b]
    this.v[b] = v
    this.rord[b] = 1
    this.andrad = true
  }

  _slumpLiv(spann) {
    return (spann[0] + this._rnd() * (spann[1] - spann[0])) | 0
  }

  _fodLiv(m) {
    if (m === ELD) return this._slumpLiv(ELD_LIV)
    if (m === ANGA) return this._slumpLiv(ANGA_LIV)
    if (m === GLOD) return this._slumpLiv(GLOD_LIV)
    return 0
  }

  // --- publika verktyg ------------------------------------------------------

  /** Måla en mjuk klick av material `m` med radien `radie` celler. */
  mala(cc, cr, radie, m) {
    const r2 = radie * radie
    let n = 0
    const tak = TAK[m]
    for (let dr = -Math.ceil(radie); dr <= Math.ceil(radie); dr++) {
      const r = cr + dr
      if (r < 0 || r >= this.rows) continue
      for (let dc = -Math.ceil(radie); dc <= Math.ceil(radie); dc++) {
        const c = cc + dc
        if (c < 0 || c >= this.cols) continue
        if (dc * dc + dr * dr > r2) continue
        // Penseln är MJUK med flit: ~72 % av cellerna skrivs. Den luckiga kanten
        // gör att eld målad mitt i en sjö får vatten kvar mellan lågorna — alltså
        // reaktioner i HELA penseldraget, inte bara längs ytterkanten.
        if (this._rnd() > 0.72) continue
        if (tak != null && this.antal[m] >= tak) continue
        if (this._satt(this.idx(c, r), m, this._fodLiv(m))) n++
      }
    }
    return n
  }

  /** Fyll en rektangel (celler). */
  fyll(c0, r0, c1, r1, m) {
    for (let r = Math.max(0, r0); r <= Math.min(this.rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(this.cols - 1, c1); c++) {
        this._satt(this.idx(c, r), m, this._fodLiv(m))
      }
    }
  }

  /**
   * Vinden: knuffar allt LÖST ett steg i sidled. Is och sten står kvar, gaser far
   * längst. Returnerar antalet celler som faktiskt flyttade sig — spelet tänder
   * vind-rutan i upptäcktsbandet först när talet är > 0, alltså när barnet SÅG det.
   */
  blas(cc, cr, radie, dir) {
    const d = dir >= 0 ? 1 : -1
    const r2 = radie * radie
    let n = 0
    // Svep MOT vinden, annars knuffar man samma korn flera gånger i ett anrop.
    const c0 = d > 0 ? cc + Math.ceil(radie) : cc - Math.ceil(radie)
    for (let k = 0; k <= Math.ceil(radie) * 2; k++) {
      const c = c0 - d * k
      if (c < 0 || c >= this.cols) continue
      for (let dr = -Math.ceil(radie); dr <= Math.ceil(radie); dr++) {
        const r = cr + dr
        if (r < 0 || r >= this.rows) continue
        const dc = c - cc
        if (dc * dc + dr * dr > r2) continue
        const i = this.idx(c, r)
        const m = this.mat[i]
        if (m === TOM || !LOS[m]) continue
        const kraft = m === ANGA || m === ELD ? 0.95 : m === VATTEN ? 0.65 : 0.5
        if (this._rnd() > kraft) continue
        const c2 = c + d
        if (c2 < 0 || c2 >= this.cols) continue
        const j = this.idx(c2, r)
        if (TATHET[m] > TATHET[this.mat[j]]) {
          this._byt(i, j)
          n++
          continue
        }
        // Sidan blockerad → försök SNETT UPP i vindens riktning. Utan den raden kan
        // vinden bara knuffa den yttersta kolumnen i en hög, och en bred sandhög såg
        // helt oberörd ut (uppmätt: `jord+vind` tände ingen ruta alls i sonden).
        // Med den eroderar vinden högens ovansida, vilket är precis vad vind gör.
        if (r > 0) {
          const k = j - this.cols
          if (TATHET[m] > TATHET[this.mat[k]]) {
            this._byt(i, k)
            n++
          }
        }
      }
    }
    return n
  }

  /** Töm hela rutan (används inte i spelet — men sonden vill kunna nollställa). */
  rensa() {
    this.mat.fill(TOM)
    this.liv.fill(0)
    this.antal.fill(0)
    this.antal[TOM] = this.cols * this.rows
    this.andrad = true
  }

  taHandelser() {
    const h = this.handelser
    this.handelser = { anga: 0, smalt: 0, lera: 0, glod: 0, is: 0 }
    return h
  }

  // --- grannuppslag ---------------------------------------------------------
  _granne(c, r, m) {
    if (r > 0 && this.mat[this.idx(c, r - 1)] === m) return this.idx(c, r - 1)
    if (r < this.rows - 1 && this.mat[this.idx(c, r + 1)] === m) return this.idx(c, r + 1)
    if (c > 0 && this.mat[this.idx(c - 1, r)] === m) return this.idx(c - 1, r)
    if (c < this.cols - 1 && this.mat[this.idx(c + 1, r)] === m) return this.idx(c + 1, r)
    return -1
  }

  // --- ett steg -------------------------------------------------------------
  steg() {
    this.steget++
    this.rord.fill(0)
    const { cols, rows } = this
    // Svepriktningen växlar varje steg. Med fast riktning driver högar konsekvent åt
    // ett håll — sanden "lutar" åt vänster och ingen förstår varför.
    const dir = this.steget & 1 ? 1 : -1
    for (let r = rows - 1; r >= 0; r--) {
      for (let k = 0; k < cols; k++) {
        const c = dir > 0 ? k : cols - 1 - k
        const i = r * cols + c
        const m = this.mat[i]
        if (m === TOM || this.rord[i]) continue
        if (this._reaktion(i, c, r, m)) continue
        this._rorelse(i, c, r, this.mat[i])
      }
    }
  }

  // Returnerar true om cellen är färdigbehandlad (bytte material eller står still).
  _reaktion(i, c, r, m) {
    let j
    switch (m) {
      case JORD:
        j = this._granne(c, r, VATTEN)
        if (j >= 0 && this._rnd() < P.LERA) {
          this._satt(i, LERA)
          this._satt(j, TOM) // vattnet SUGS UPP — en pöl räcker inte hur långt som helst
          this.handelser.lera++
          return true
        }
        j = this._granne(c, r, ELD)
        if (j >= 0 && this._rnd() < P.GLOD && this.antal[GLOD] < TAK[GLOD]) {
          this._satt(i, GLOD, this._slumpLiv(GLOD_LIV))
          this.handelser.glod++
          return true
        }
        return false

      case VATTEN:
        j = this._granne(c, r, ELD)
        if (j >= 0 && this._rnd() < P.ANGA) {
          this._satt(i, ANGA, this._slumpLiv(ANGA_LIV))
          if (this._rnd() < 0.7) this._satt(j, TOM) // elden släcks av vattnet
          this.handelser.anga++
          return true
        }
        j = this._granne(c, r, GLOD)
        if (j >= 0) {
          this._satt(i, ANGA, this._slumpLiv(ANGA_LIV))
          this._satt(j, STEN) // glöden fräser till sten
          this.handelser.anga++
          return true
        }
        j = this._granne(c, r, IS)
        if (j >= 0 && this._rnd() < P.ISVAX) {
          this._satt(i, IS)
          this.handelser.is++
          return true
        }
        return false

      case IS:
        j = this._granne(c, r, ELD)
        if (j >= 0 && this._rnd() < P.SMALT) {
          this._satt(i, VATTEN)
          if (this._rnd() < 0.6) this._satt(j, TOM)
          this.handelser.smalt++
          return true
        }
        return true // is rör sig aldrig

      case STEN:
        return true

      case ELD: {
        const l = this.liv[i]
        if (l <= 1) {
          this._satt(i, this._rnd() < P.ELD_ROK ? ANGA : TOM, this._slumpLiv(ANGA_LIV) >> 1)
          return true
        }
        this.liv[i] = l - 1
        return false
      }

      case ANGA: {
        const l = this.liv[i]
        if (l <= 1 || r === 0) {
          this._satt(i, TOM)
          return true
        }
        this.liv[i] = l - 1
        return false
      }

      case GLOD: {
        const l = this.liv[i]
        if (l <= 1) {
          this._satt(i, STEN) // svalnar till sten — ingen upptäckt, den tändes vid födseln
          return true
        }
        this.liv[i] = l - 1
        j = this._granne(c, r, LERA)
        if (j >= 0 && this._rnd() < P.TORKA) this._satt(j, JORD)
        return false
      }

      case LERA:
        j = this._granne(c, r, ELD)
        if (j >= 0 && this._rnd() < P.TORKA) {
          this._satt(i, JORD) // MOTGÅNG: elden torkar leran tillbaka till jord
          return true
        }
        return false

      case FRO:
        if (this._granne(c, r, LERA) >= 0) {
          this.groddar.push(i)
          this._satt(i, TOM)
          return true
        }
        return false

      default:
        return false
    }
  }

  _rorelse(i, c, r, m) {
    const { cols, rows } = this
    if (PULVER[m]) {
      if (r >= rows - 1) return
      const ner = i + cols
      if (TATHET[m] > TATHET[this.mat[ner]]) {
        this._byt(i, ner)
        return
      }
      if (m === LERA && this._rnd() > P.LERA_GLID) return
      const s = this._rnd() < 0.5 ? -1 : 1
      for (const d of [s, -s]) {
        const c2 = c + d
        if (c2 < 0 || c2 >= cols) continue
        const j = ner + d
        if (TATHET[m] > TATHET[this.mat[j]]) {
          this._byt(i, j)
          return
        }
      }
      return
    }

    if (m === VATTEN) {
      if (r < rows - 1) {
        const ner = i + cols
        if (TATHET[VATTEN] > TATHET[this.mat[ner]]) {
          this._byt(i, ner)
          return
        }
        const s = this._rnd() < 0.5 ? -1 : 1
        for (const d of [s, -s]) {
          const c2 = c + d
          if (c2 < 0 || c2 >= cols) continue
          const j = ner + d
          if (TATHET[VATTEN] > TATHET[this.mat[j]]) {
            this._byt(i, j)
            return
          }
        }
      }
      // Sidled: varje droppe minns sin riktning (v-bitens lägsta bit) så en pöl
      // BREDER UT SIG i stället för att darra på stället.
      const d = this.v[i] & 1 ? 1 : -1
      for (const dd of [d, -d]) {
        const c2 = c + dd
        if (c2 < 0 || c2 >= cols) continue
        const j = i + dd
        if (TATHET[VATTEN] > TATHET[this.mat[j]]) {
          this.v[i] = dd > 0 ? this.v[i] | 1 : this.v[i] & ~1
          this._byt(i, j)
          return
        }
      }
      return
    }

    if (m === ELD || m === ANGA) {
      // Stiger. Elden fladdrar (bara ibland), ångan går rakt upp och tar en diagonal
      // när den möter tak — annars samlas den i en platt hinna under ett hinder.
      if (m === ELD && this._rnd() > P.ELD_STIG) return
      if (r <= 0) return
      const upp = i - cols
      if (this.mat[upp] === TOM) {
        this._byt(i, upp)
        return
      }
      const s = this._rnd() < 0.5 ? -1 : 1
      for (const d of [s, -s]) {
        const c2 = c + d
        if (c2 < 0 || c2 >= cols) continue
        const j = upp + d
        if (this.mat[j] === TOM) {
          this._byt(i, j)
          return
        }
        const sid = i + d
        if (m === ANGA && this.mat[sid] === TOM) {
          this._byt(i, sid)
          return
        }
      }
    }
  }
}
