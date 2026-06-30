// Talad svenska driver navigeringen för barn som inte kan läsa.
// Hybrid: spelar förgenererade neurala röstklipp (F5-TTS, svensk modell — se
// scripts/gen-voice.py) när repliken finns i manifestet, annars faller den
// tillbaka på Web Speech (sv-SE). Klippen är inbäddade och spelas helt offline.
// say()-API:t är oförändrat så spel/skärmar inte behöver veta vilken motor som körs.
const MANIFEST_URL = `${import.meta.env.BASE_URL}audio/voice/manifest.json`
const CLIP_BASE = `${import.meta.env.BASE_URL}audio/voice/`
// Anti-upprepning: säg INTE exakt samma fras igen inom detta fönster (ms). Skyddar
// mot idle-recue-loopar / spel som råkar kalla say() i tät takt med samma replik.
const REPEAT_COOLDOWN_MS = 8000
const _now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

export class VoiceService {
  constructor(save) {
    this.save = save
    this.last = null
    this.voice = null
    // text -> klipp-URL (laddas en gång, asynkront; tomt tills dess -> Web Speech)
    this._clips = new Map()
    this._audio = null // HTMLAudioElement som spelas just nu (för att kunna avbryta)
    this._queue = [] // återstående klipp-URL:er när en replik spelas mening-för-mening
    this._supported = typeof window !== 'undefined' && 'speechSynthesis' in window
    if (this._supported) {
      this._pick()
      try {
        window.speechSynthesis.addEventListener('voiceschanged', () => this._pick())
      } catch {
        /* äldre webbläsare */
      }
    }
    this._loadManifest()
  }

  get enabled() {
    return this.save.data.settings.voiceEnabled
  }

  get available() {
    return this._supported || this._clips.size > 0
  }

  get _volume() {
    const v = this.save?.data?.settings?.masterVolume
    return typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 1
  }

  async _loadManifest() {
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
      if (!res.ok) return
      const map = await res.json()
      for (const [text, file] of Object.entries(map)) {
        this._clips.set(text, CLIP_BASE + file)
      }
    } catch {
      /* inga klipp -> Web Speech-fallback */
    }
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
  // force=true (uttrycklig repetera-knapp) kringgår anti-upprepnings-fönstret.
  say(text, force = false) {
    if (!text) return
    // Undertryck exakt samma fras om den nyss sades (anti-upprepning/loop-skydd).
    // Andra repliker spelas direkt; bara identisk text inom fönstret hoppas över.
    // Auto-recue (replayLast utan force) tystas; en uttrycklig knapp-tryckning gör det inte.
    const now = _now()
    if (!force && text === this.last && now - (this._lastSayAt || 0) < REPEAT_COOLDOWN_MS) return
    this.last = text
    this._lastSayAt = now
    if (!this.enabled) return
    this.cancel()
    const exact = this._clips.get(text)
    if (exact) {
      this._playUrls([exact])
      return
    }
    // Kedja: dela upp i meningar och spela ett klipp per mening om ALLA finns
    // (täcker "statisk mening! + slumpat beröm!" utan en kombinatorisk klipp-explosion).
    const parts = this._splitSentences(text)
    if (parts.length > 1) {
      const urls = parts.map((p) => this._clips.get(p))
      if (urls.every(Boolean)) {
        this._playUrls(urls)
        return
      }
    }
    this._speak(text)
  }

  _splitSentences(text) {
    return text
      .split(/(?<=[!?.])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  _playUrls(urls) {
    this._queue = urls.slice()
    this._playNext()
  }

  _playNext() {
    const url = this._queue.shift()
    if (!url) {
      this._audio = null
      return
    }
    try {
      const a = new Audio(url)
      a.volume = this._volume
      this._audio = a
      a.addEventListener('ended', () => {
        if (this._audio === a) this._playNext()
      })
      // Om autoplay blockeras (ingen användargest ännu) -> tyst fallback till tal.
      const p = a.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (this._audio === a) {
            this._audio = null
            this._queue = []
            this._speak(this.last)
          }
        })
      }
    } catch {
      this._queue = []
      this._speak(this.last)
    }
  }

  _speak(text) {
    if (!text || !this._supported) return
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'sv-SE'
      if (this.voice) u.voice = this.voice
      u.rate = 0.95
      u.pitch = 1.12
      u.volume = this._volume
      synth.speak(u)
    } catch {
      /* tyst om talsyntes saknas */
    }
  }

  // force=true för den uttryckliga repetera-knappen (alltid spela); utan force
  // (spelens idle-recue) gäller anti-upprepnings-fönstret.
  replayLast(force = false) {
    if (this.last) this.say(this.last, force)
  }

  cancel() {
    this._queue = []
    if (this._audio) {
      try {
        this._audio.pause()
        this._audio.currentTime = 0
      } catch {
        /* noop */
      }
      this._audio = null
    }
    if (this._supported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* noop */
      }
    }
  }
}
