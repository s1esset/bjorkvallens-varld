// Tunn wrapper runt Pixis Assets. Varje spel kan registrera en egen "bundle"
// (atlas + ljud) och ladda/avlasta den vid in-/utgång. De första spelen ritar
// allt programmatiskt (inga externa bilder), så bundles är frivilliga.
import { Assets } from 'pixi.js'

export class AssetService {
  constructor() {
    this._registered = new Set()
    this._inited = false
  }

  async init() {
    if (this._inited) return
    try {
      await Assets.init()
    } catch {
      /* Assets kan redan vara initierad */
    }
    this._inited = true
  }

  // manifest: { nyckel: url, ... }
  registerBundle(name, manifest) {
    if (!name || this._registered.has(name)) return
    try {
      Assets.addBundle(name, manifest)
      this._registered.add(name)
    } catch (err) {
      console.warn('Kunde inte registrera bundle', name, err)
    }
  }

  async loadBundle(name) {
    if (!name || !this._registered.has(name)) return null
    try {
      return await Assets.loadBundle(name)
    } catch (err) {
      console.warn('Kunde inte ladda bundle', name, err)
      return null
    }
  }

  async unloadBundle(name) {
    if (!name || !this._registered.has(name)) return
    try {
      await Assets.unloadBundle(name)
    } catch {
      /* noop */
    }
  }

  get(key) {
    try {
      return Assets.get(key)
    } catch {
      return null
    }
  }
}
