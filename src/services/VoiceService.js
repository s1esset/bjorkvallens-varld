// Talad svenska driver navigeringen för barn som inte kan läsa.
// Grundbygge: Web Speech API (SpeechSynthesis, sv-SE) — funktionsdetekteras.
// Produktion: byt till förgenererade Piper-klipp (offline) och behåll say()-API:t.
export class VoiceService {
  constructor(save) {
    this.save = save
    this.last = null
    this.voice = null
    this._supported = typeof window !== 'undefined' && 'speechSynthesis' in window
    if (this._supported) {
      this._pick()
      try {
        window.speechSynthesis.addEventListener('voiceschanged', () => this._pick())
      } catch {
        /* äldre webbläsare */
      }
    }
  }

  get enabled() {
    return this.save.data.settings.voiceEnabled
  }

  get available() {
    return this._supported
  }

  _pick() {
    try {
      const vs = window.speechSynthesis.getVoices()
      this.voice = vs.find((v) => v.lang === 'sv-SE') || vs.find((v) => (v.lang || '').toLowerCase().startsWith('sv')) || null
    } catch {
      this.voice = null
    }
  }

  // Säg en svensk fras. (text kan innehålla å/ä/ö.)
  say(text) {
    if (!text) return
    this.last = text
    if (!this.enabled || !this._supported) return
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'sv-SE'
      if (this.voice) u.voice = this.voice
      u.rate = 0.95
      u.pitch = 1.12
      u.volume = 1
      synth.speak(u)
    } catch {
      /* tyst om talsyntes saknas */
    }
  }

  replayLast() {
    if (this.last) this.say(this.last)
  }

  cancel() {
    if (this._supported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* noop */
      }
    }
  }
}
