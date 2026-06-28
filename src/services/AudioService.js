// Ljudeffekter syntetiseras med Web Audio (inga ljudfiler krävs i grundbygget).
// Produktion: byt till @pixi/sound + förinspelade CC0-klipp — behåll samma sfx()-API.
// Respekterar inställningarna (sfxEnabled, masterVolume) och låses upp vid första pekningen.
export class AudioService {
  constructor(save) {
    this.save = save
    this.ctx = null
    this._bindUnlock()
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

  // Spela en namngiven effekt. Många är medvetet "snälla" — aldrig en hård buzzer.
  sfx(name) {
    if (!this._s.sfxEnabled) return
    const c = this._ensure()
    if (!c) return
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

  // Musik är en stub i grundbygget (respekterar flaggan). Lägg till en lugn loop senare.
  playMusic() {}
  stopMusic() {}
}
