// Klistermärken = den tvärgående belöningsslingan (mönster #11). Ett spel som
// klaras ger ett klistermärke till den aktiva profilen (en gång per spel).
export class StickerService {
  constructor(save, profiles) {
    this.save = save
    this.profiles = profiles
  }

  award(gameId) {
    let wasNew = false
    this.save.update((d) => {
      const p = d.profiles.find((x) => x.id === d.activeProfileId)
      if (!p) return
      if (!p.stats) p.stats = { totalPlaySeconds: 0, starsTotal: 0, stickers: [] }
      if (!Array.isArray(p.stats.stickers)) p.stats.stickers = []
      if (!p.stats.stickers.includes(gameId)) {
        p.stats.stickers.push(gameId)
        wasNew = true
      }
    })
    return wasNew
  }

  list() {
    return this.profiles.active()?.stats?.stickers || []
  }

  has(gameId) {
    return this.list().includes(gameId)
  }
}
