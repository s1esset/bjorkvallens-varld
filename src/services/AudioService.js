// Ljud = hybrid. Förinspelade RIKTIGA klipp (genererade offline av scripts/gen-sfx.py
// via den lokala MOSS-SoundEffect-tjänsten) spelas när de finns; annars faller vi
// tillbaka på den procedurella Web Audio-syntesen nedan. Samma sfx()-API oavsett källa.
// Små UI-blipp (tap/pling/flip/correct/match/soft) är medvetet kvar som syntes —
// MOSS är foley-/texturinriktad och brusig för knastriga musikaliska blipp.
// Respekterar inställningarna (sfxEnabled, masterVolume) och låses upp vid första pekningen.
export class AudioService {
  constructor(save) {
    this.save = save
    this.ctx = null
    this._samples = new Map() // namn -> AudioBuffer (avkodat, redo att spelas)
    this._sampleUrls = new Map() // namn -> url (från manifest.json)
    this._decoding = new Set()
    this._bindUnlock()
    this._loadSfxManifest()
  }

  get _s() {
    return this.save.data.settings
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) this.ctx = new AC()
    }
    return this.ctx
  }

  _bindUnlock() {
    const resume = () => {
      const c = this._ensure()
      if (c && c.state === 'suspended') c.resume()
      // Värm upp avkodningen av riktiga klipp vid första gesten (lågt latens sen).
      this._predecodeAll()
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('touchstart', resume)
  }

  // En enkel ton med ADSR-liknande hölje.
  _tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.3, slideTo = null, delay = 0 }) {
    const c = this._ensure()
    if (!c) return
    const master = this._s.masterVolume ?? 0.8
    const t0 = c.currentTime + delay
    const o = c.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
    const g = c.createGain()
    const peak = Math.max(0.0001, vol * master)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(c.destination)
    o.start(t0)
    o.stop(t0 + dur + 0.03)
  }

  _seq(notes) {
    notes.forEach((n) => this._tone(n))
  }

  // Publikt: en enkel pitchad ton (musikalisk blip). För kombo-stegar/melodi-spel som
  // vill ha ÄKTA tonhöjd (ren syntes; inga sample-klipp behövs). Respekterar sfxEnabled +
  // masterVolume. Går förbi sfx()-anti-loop-skyddet med flit (varje ton har egen tonhöjd).
  tone(opts) {
    if (!this._s.sfxEnabled) return
    if (!this._ensure()) return
    this._tone(opts)
  }

  // Spela en namngiven effekt. Många är medvetet "snälla" — aldrig en hård buzzer.
  sfx(name) {
    if (!this._s.sfxEnabled) return
    const c = this._ensure()
    if (!c) return
    // Globalt anti-loop-skydd: samma ljud kan inte spela snabbare än var 30:e ms.
    // Ett ljud som triggas varje frame (~60/s) är alltid en bugg/loop som distar —
    // 30ms-golvet (~33/s) stoppar det men är omärkbart för riktig lek (tap ≤ ~5/s).
    const t = c.currentTime * 1000
    if (!this._lastSfxAt) this._lastSfxAt = new Map()
    if (t - (this._lastSfxAt.get(name) || -1e9) < 30) return
    this._lastSfxAt.set(name, t)
    // Vinstljudet varieras varje gång så det inte blir enformigt (se _celebrate).
    if (name === 'celebrate') return this._celebrate()
    // Riktigt klipp om det finns och är avkodat, annars procedurell syntes nedan.
    if (this._playSample(name)) return
    const rnd = (a, b) => a + Math.random() * (b - a)
    switch (name) {
      case 'tap':
        this._tone({ freq: 520, dur: 0.08, type: 'triangle', vol: 0.22 })
        break
      case 'pop':
        // glatt "plopp" med slumpad tonhöjd
        this._tone({ freq: rnd(360, 760), dur: 0.12, type: 'sine', vol: 0.34, slideTo: rnd(160, 260) })
        break
      case 'pling':
        this._tone({ freq: 880, dur: 0.18, type: 'triangle', vol: 0.3 })
        this._tone({ freq: 1320, dur: 0.16, type: 'sine', vol: 0.18, delay: 0.04 })
        break
      case 'flip':
        this._tone({ freq: 300, dur: 0.1, type: 'square', vol: 0.16, slideTo: 520 })
        break
      case 'correct':
        this._seq([
          { freq: 660, dur: 0.12, type: 'triangle', vol: 0.3 },
          { freq: 880, dur: 0.16, type: 'triangle', vol: 0.3, delay: 0.1 },
        ])
        break
      case 'match':
        this._seq([
          { freq: 660, dur: 0.12, type: 'sine', vol: 0.28 },
          { freq: 990, dur: 0.12, type: 'sine', vol: 0.26, delay: 0.09 },
          { freq: 1320, dur: 0.18, type: 'sine', vol: 0.22, delay: 0.18 },
        ])
        break
      case 'kristall_klirr':
        // glasigt kristallklirr — C7/E7/G7 så det aldrig krockar med pentaskalor i C
        this._tone({ freq: 2093, dur: 0.14, type: 'sine', vol: 0.16 })
        this._tone({ freq: 2637, dur: 0.12, type: 'sine', vol: 0.1, delay: 0.03 })
        this._tone({ freq: 3136, dur: 0.1, type: 'triangle', vol: 0.05, delay: 0.06 })
        break
      case 'soft':
        // mjuk "inte riktigt"-ton, lekfull och neutral (ingen bestraffning)
        this._tone({ freq: 300, dur: 0.16, type: 'sine', vol: 0.2, slideTo: 220 })
        break
      case 'whoosh':
        this._tone({ freq: 200, dur: 0.22, type: 'sawtooth', vol: 0.12, slideTo: 700 })
        break
      case 'reveal':
        this._seq([
          { freq: 780, dur: 0.1, type: 'sine', vol: 0.24 },
          { freq: 1040, dur: 0.14, type: 'sine', vol: 0.2, delay: 0.06 },
        ])
        break
      case 'celebrate':
        // glad fanfar (C–E–G–C)
        this._seq([
          { freq: 523, dur: 0.16, type: 'triangle', vol: 0.32 },
          { freq: 659, dur: 0.16, type: 'triangle', vol: 0.32, delay: 0.12 },
          { freq: 784, dur: 0.16, type: 'triangle', vol: 0.32, delay: 0.24 },
          { freq: 1047, dur: 0.34, type: 'triangle', vol: 0.34, delay: 0.36 },
        ])
        break
      default:
        this._tone({ freq: 500, dur: 0.1, type: 'sine', vol: 0.2 })
    }
  }

  // Vinstljud med variation så det inte tröttar ut (användarfeedback: "win sound
  // getts annoying fast"). Riktigt klipp → lätt pitch/tempo-variation + ibland en
  // glittertopp; annars slumpas en glad fanfar bland flera tonarter/mönster.
  _celebrate() {
    const c = this.ctx
    if (!c) return
    const rnd = (a, b) => a + Math.random() * (b - a)
    const master = Math.max(0.0001, this._s.masterVolume ?? 0.8)
    const buf = this._samples.get('celebrate')
    if (buf) {
      try {
        const src = c.createBufferSource()
        src.buffer = buf
        src.playbackRate.value = rnd(0.92, 1.12) // varierad tonhöjd/tempo
        const g = c.createGain()
        g.gain.value = master
        src.connect(g).connect(c.destination)
        src.start()
        if (Math.random() < 0.5) this._tone({ freq: rnd(1500, 2100), dur: 0.18, type: 'sine', vol: 0.13, delay: rnd(0.18, 0.4) })
        return
      } catch {
        /* falla till syntes nedan */
      }
    } else if (this._sampleUrls.has('celebrate')) {
      this._decodeOne('celebrate') // värm upp till nästa gång
    }
    // Syntes-fallback: slumpa tonart + arpeggio-mönster så varje vinst låter ny.
    const root = [523.25, 587.33, 659.25, 698.46][Math.floor(Math.random() * 4)] // C/D/E/F-dur-ish
    const patterns = [[0, 4, 7, 12], [0, 7, 4, 12], [0, 4, 7, 11], [0, 5, 9, 12], [7, 4, 0, 12], [0, 4, 9, 12]]
    const pat = patterns[Math.floor(Math.random() * patterns.length)]
    const type = Math.random() < 0.5 ? 'triangle' : 'sine'
    const step = rnd(0.1, 0.14)
    this._seq(
      pat.map((s, i) => ({
        freq: root * Math.pow(2, s / 12),
        dur: i === pat.length - 1 ? 0.34 : 0.16,
        type,
        vol: 0.32,
        delay: i * step,
      }))
    )
  }

  // --- förinspelade riktiga klipp (offline, genererade av scripts/gen-sfx.py) ---

  async _loadSfxManifest() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}audio/sfx/manifest.json`, { cache: 'no-cache' })
      if (!res.ok) return
      const map = await res.json()
      for (const [k, f] of Object.entries(map)) {
        this._sampleUrls.set(k, `${import.meta.env.BASE_URL}audio/sfx/${f}`)
      }
      // Skapa AudioContext direkt och börja avkoda i bakgrunden — att vänta på _bindUnlock()s
      // pointerdown gjorde att avkodningen startade i EXAKT samma ögonblick som det tryck som
      // ska trigga det första ljudet (V8). decodeAudioData funkar i suspended state; bara
      // uppspelning kräver en användargest, inte konstruktion eller avkodning.
      this._ensure()
      if (this.ctx) this._predecodeAll()
    } catch {
      /* inga klipp -> procedurell syntes / röst-fallback */
    }
  }

  _predecodeAll() {
    for (const name of this._sampleUrls.keys()) this._decodeOne(name)
  }

  async _decodeOne(name) {
    if (this._samples.has(name) || this._decoding.has(name)) return
    const url = this._sampleUrls.get(name)
    if (!url) return
    const c = this._ensure()
    if (!c) return
    this._decoding.add(name)
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const ab = await res.arrayBuffer()
      const buf = await c.decodeAudioData(ab)
      this._samples.set(name, buf)
    } catch {
      /* avkodning misslyckades -> fallback */
    } finally {
      this._decoding.delete(name)
    }
  }

  // Spela ett förinspelat klipp om det finns OCH är avkodat. Returnerar true om det spelades.
  _playSample(name) {
    const buf = this._samples.get(name)
    if (!buf) {
      // inte avkodat ännu -> starta avkodningen så det är redo nästa gång
      if (this._sampleUrls.has(name)) this._decodeOne(name)
      return false
    }
    const c = this.ctx
    if (!c) return false
    try {
      const src = c.createBufferSource()
      src.buffer = buf
      const g = c.createGain()
      g.gain.value = Math.max(0.0001, this._s.masterVolume ?? 0.8)
      src.connect(g).connect(c.destination)
      src.start()
      return true
    } catch {
      return false
    }
  }

  // Publikt: spela ENBART ett förinspelat klipp (t.ex. djurläten). Ingen syntes-fallback —
  // returnerar true om ett klipp spelades, annars false (spelet kan då falla tillbaka på rösten).
  // Finns klippet ÖVER HUVUD TAGET i manifestet? Ett spel som bygger på ljud som ännu
  // inte är inspelade (pappas uttrycksljud i `mata-munnen`) kan fråga först och välja en
  // syntes-väg i stället — annars flaggar varje anrop `saknat-ljudklipp` i testloggen och
  // dränker de fynd som är riktiga.
  harSample(name) {
    return this._sampleUrls.has(name)
  }

  // Hur långt är klippet, i sekunder? 0 om det inte är avkodat (eller inte finns).
  // Behövs av spel som SCHEMALÄGGER något efter ett klipp: en tidtabell som stämmer mot
  // en kort syntes-reserv är inte prövad mot det inspelade klipp som ersätter den, och i
  // `mata-munnen` lade berättarrösten sig ovanpå pappas egen röst så fort klippen blev
  // riktiga (0,3 s ton → 1,9 s inspelning). Läs längden i stället för att gissa den —
  // ett hårdkodat tal driver isär från filen vid nästa omtagning.
  sampleDuration(name) {
    return this._samples.get(name)?.duration || 0
  }

  sample(name) {
    if (!this._s.sfxEnabled) return false
    const c = this._ensure()
    if (!c) return false
    return this._playSample(name)
  }

  // ------------------------------------------------------------- slingor ---
  //
  // ETT LJUD SOM HÖR IHOP MED ETT TILLSTÅND, inte med en händelse. Allt i appen har
  // hittills varit engångsljud vid tryck, och det räcker för en knapp — men inte för en
  // kran som RINNER eller en fläkt som SNURRAR. I `mata-munnen` klickade man på fläkten,
  // hörde ett enda brum, och sedan snurrade den ljudlöst: samma brutna orsak–verkan som
  // en ketchupflaska som inte går att hälla (kritikerfynd v1.198).
  //
  // Två källor, samma API: ett inspelat klipp om det finns (`klipp`), annars en syntetisk
  // bädd. Bädden är BRUS genom ett bandpass (vatten, ånga) eller en filtrerad ton (motorer)
  // — inte en naken oscillator, som i en slinga blir en olidlig pipton.
  //
  // ⚠️ Påslag och avslag RAMPAS. Ett hårt påslag på en kontinuerlig källa knäpper i
  // högtalaren, och knäppet är det enda man hör på en telefon.

  _brus(c) {
    if (this._noiseBuf) return this._noiseBuf
    const n = Math.floor(c.sampleRate * 2)
    const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    this._noiseBuf = buf
    return buf
  }

  /**
   * Starta (eller byt ut) en namngiven slinga. Samma namn två gånger = den gamla stoppas
   * först, så en dubbelklickad station aldrig kan lägga två brum ovanpå varandra.
   */
  loop(namn, { klipp = null, typ = 'ton', freq = 180, q = 1.2, vol = 0.12 } = {}) {
    if (!this._s.sfxEnabled) return false
    const c = this._ensure()
    if (!c) return false
    this.stopLoop(namn)
    if (!this._loops) this._loops = new Map()
    try {
      const g = c.createGain()
      g.gain.value = 0.0001
      g.connect(c.destination)
      let src
      if (klipp && this._samples.has(klipp)) {
        src = c.createBufferSource()
        src.buffer = this._samples.get(klipp)
        src.loop = true
        src.connect(g)
      } else if (typ === 'brus') {
        src = c.createBufferSource()
        src.buffer = this._brus(c)
        src.loop = true
        const f = c.createBiquadFilter()
        f.type = 'bandpass'
        f.frequency.value = freq
        f.Q.value = q
        src.connect(f).connect(g)
      } else {
        src = c.createOscillator()
        src.type = 'sawtooth'
        src.frequency.value = freq
        const f = c.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.value = freq * 3.2
        f.Q.value = q
        src.connect(f).connect(g)
      }
      src.start()
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol * (this._s.masterVolume ?? 0.8)), c.currentTime + 0.25)
      this._loops.set(namn, { src, g })
      return true
    } catch {
      return false
    }
  }

  stopLoop(namn) {
    const l = this._loops?.get(namn)
    if (!l) return
    this._loops.delete(namn)
    const c = this.ctx
    try {
      if (c) {
        l.g.gain.cancelScheduledValues(c.currentTime)
        l.g.gain.setValueAtTime(Math.max(0.0001, l.g.gain.value), c.currentTime)
        l.g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.18)
        l.src.stop(c.currentTime + 0.22)
      } else {
        l.src.stop()
      }
    } catch { /* källan kan redan vara stoppad */ }
  }

  /**
   * Yttersta säkringen. En slinga som ett spel glömmer att stoppa fortsätter låta på
   * MENYN — och till skillnad från en kvarglömd tween hörs den, hela vägen tills appen
   * stängs. `GameHost.destroy` kallar den här efter varje omgång, så ett spel kan inte
   * lämna ett ljud efter sig ens om dess egen `destroy` kraschar.
   */
  stopAllLoops() {
    for (const namn of [...(this._loops?.keys() || [])]) this.stopLoop(namn)
  }

  // Musik är en stub i grundbygget (respekterar flaggan). Lägg till en lugn loop senare.
  playMusic() {}
  stopMusic() {}
}
