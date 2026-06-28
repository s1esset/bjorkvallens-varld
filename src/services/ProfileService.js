// Hanterar barnprofiler ovanpå SaveService: skapa, byt namn, ta bort, nollställ, välj aktiv.
// Profilnamn lagras som de skrivs (åäö ok) och lämnar aldrig enheten.
import { AVATARS } from '../lib/swedish.js'

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}
function nowISO() {
  return new Date().toISOString()
}

function newProfile(name, avatar) {
  const t = nowISO()
  return {
    id: uid(),
    name: name || 'Barn',
    avatar: avatar || AVATARS[0].id,
    createdAt: t,
    lastPlayedAt: t,
    settings: {},
    stats: { totalPlaySeconds: 0, starsTotal: 0, stickers: [] },
    games: {},
  }
}

export class ProfileService {
  constructor(save) {
    this.save = save
    // Säkerställ minst en profil + en aktiv profil vid första start.
    if (this.list().length === 0) this.create('Barn', AVATARS[0].id)
    if (!this.activeId() || !this.active()) {
      this.save.update((d) => {
        d.activeProfileId = d.profiles[0].id
      })
    }
  }

  list() {
    return this.save.data.profiles
  }

  activeId() {
    return this.save.data.activeProfileId
  }

  active() {
    return this.list().find((p) => p.id === this.activeId()) || this.list()[0] || null
  }

  setActive(id) {
    this.save.update((d) => {
      if (d.profiles.some((p) => p.id === id)) d.activeProfileId = id
    })
  }

  create(name, avatar) {
    const p = newProfile(name, avatar)
    this.save.update((d) => {
      d.profiles.push(p)
      if (!d.activeProfileId) d.activeProfileId = p.id
    })
    return p
  }

  rename(id, name) {
    this.save.update((d) => {
      const p = d.profiles.find((x) => x.id === id)
      if (p) p.name = name
    })
  }

  setAvatar(id, avatar) {
    this.save.update((d) => {
      const p = d.profiles.find((x) => x.id === id)
      if (p) p.avatar = avatar
    })
  }

  remove(id) {
    this.save.update((d) => {
      d.profiles = d.profiles.filter((p) => p.id !== id)
      if (d.activeProfileId === id) d.activeProfileId = d.profiles[0]?.id ?? null
    })
    if (this.list().length === 0) this.create('Barn', AVATARS[0].id)
  }

  resetProfile(id) {
    this.save.update((d) => {
      const p = d.profiles.find((x) => x.id === id)
      if (p) {
        p.games = {}
        p.stats = { totalPlaySeconds: 0, starsTotal: 0, stickers: [] }
      }
    })
  }

  touchPlayed() {
    this.save.update((d) => {
      const p = d.profiles.find((x) => x.id === d.activeProfileId)
      if (p) p.lastPlayedAt = nowISO()
    })
  }
}
