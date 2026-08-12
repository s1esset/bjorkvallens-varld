// Sparar hela spar-dokumentet som JSON i localStorage (en nyckel + en backup-nyckel).
// Debouncad skrivning + synkron flush när fliken göms/stängs. Validera vid laddning,
// fall tillbaka till backup, kör migreringar. Se save-schemat i CLAUDE.md.
const KEY = 'pwagames.save.v1'
const BAK = 'pwagames.save.bak'
const SCHEMA_VERSION = 1

function nowISO() {
  return new Date().toISOString()
}

function defaultDoc() {
  const t = nowISO()
  return {
    schemaVersion: SCHEMA_VERSION,
    app: 'pwagames',
    createdAt: t,
    updatedAt: t,
    activeProfileId: null,
    settings: {
      masterVolume: 0.8,
      musicEnabled: true,
      sfxEnabled: true,
      voiceEnabled: true,
      parentalGateEnabled: true,
      sessionReminderMinutes: 0,
      // Sänker app-bred detaljnivå (lib/form.js `setDetaljniva`) från 2 till 0: platta
      // färger i stället för bakade gradienter. För svaga plattor. Se LYFTPLAN C10.
      enklareGrafik: false,
    },
    profiles: [],
  }
}

export class SaveService {
  constructor() {
    this.data = this._load()
    this._timer = null
    this._bindFlush()
    this._requestPersist()
  }

  _load() {
    for (const key of [KEY, BAK]) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) return this._migrate(this._validate(JSON.parse(raw)))
      } catch (err) {
        console.warn(`Spar-data i ${key} kunde inte läsas`, err)
      }
    }
    return defaultDoc()
  }

  _validate(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.profiles) || typeof d.settings !== 'object') {
      throw new Error('ogiltigt spar-dokument')
    }
    return d
  }

  _migrate(d) {
    // Framtida migreringar: while (d.schemaVersion < SCHEMA_VERSION) { ... d.schemaVersion++ }
    d.schemaVersion = SCHEMA_VERSION
    if (!d.settings) d.settings = defaultDoc().settings
    // Ett dokument som skrevs innan en inställning fanns har NYCKELN saknad, inte hela
    // objektet — utan den här påfyllningen blir varje ny inställning `undefined` hos alla
    // befintliga användare, och en toggle som läser `undefined` visar fel läge.
    const std = defaultDoc().settings
    for (const k of Object.keys(std)) if (d.settings[k] === undefined) d.settings[k] = std[k]
    return d
  }

  // Muterar dokumentet via en callback och schemalägger en skrivning.
  update(mutator) {
    mutator(this.data)
    this.data.updatedAt = nowISO()
    this._schedule()
  }

  _schedule() {
    clearTimeout(this._timer)
    this._timer = setTimeout(() => this.flush(), 500)
  }

  flush() {
    clearTimeout(this._timer)
    try {
      const raw = JSON.stringify(this.data)
      const prev = localStorage.getItem(KEY)
      if (prev && prev !== raw) localStorage.setItem(BAK, prev)
      localStorage.setItem(KEY, raw)
    } catch (err) {
      console.error('Kunde inte spara (kvot full?)', err)
    }
  }

  _bindFlush() {
    const f = () => this.flush()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') f()
    })
    window.addEventListener('pagehide', f)
  }

  async _requestPersist() {
    try {
      if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
        await navigator.storage.persist()
      }
    } catch {
      /* inte kritiskt */
    }
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2)
  }

  importJSON(text) {
    const d = this._migrate(this._validate(JSON.parse(text)))
    this.data = d
    this.flush()
    return d
  }

  resetAll() {
    this.data = defaultDoc()
    this.flush()
  }
}
