// Lappar i Pixi som hela appen behöver — på ETT ställe, körda av `App.js` innan första
// grafiken skapas. Varje lapp gör något Pixi redan gör i en annan gren; inga egna regler.
import { Graphics } from 'pixi.js'

let lappad = false

export function lappaPixi() {
  if (lappad) return
  lappad = true
  lappaGraphicsDestroy()
}

// ÅTGÄRDER V16. `Graphics.destroy(options)` river den ÄGDA GraphicsContexten bara när
// `options` saknas eller är `true`/`{ context: true }` (Pixi 8.19, `Graphics.mjs:145-153`).
// Ett options-OBJEKT — repots `destroy({ children: true })`, 251 anrop i 89 filer — faller
// mellan grenarna, och kontexten ligger kvar med sin GPU-data tills renderarens GC tar den:
// först när den varit orenderad i 60 s, och GC:n körs var 30:e sekund.
//
// MÄTT (`scripts/_graflackprobe.mjs`, tolv spelbyten på 56 s): 1 883 föräldralösa kontexter ·
// 8,1 MB GL-buffertar · heap 120 MB direkt efteråt, tillbaka på menyns baslinje först efter
// 60–80 s. Med lappen: 4 kontexter (menyns egna) · 3,2 MB · 84 MB. Barlasten med GC:n avslagen
// stod kvar på 1 886 i två minuter — det är GC:n och inget spel som städar i dag, så felet var
// en TOPP efter varje spelbyte, aldrig en läcka som växer för evigt.
//
// Lappen gör för ett options-objekt exakt det Pixi själv gör för `destroy()` utan argument.
// En DELAD kontext rörs aldrig: `_ownedContext` sätts bara när grafiken skapade kontexten
// själv, och `clone()` nollar den på originalet. Ett uttryckligt `context: false` respekteras.
// Byter Pixi namn på fältet blir lappen en no-op, aldrig ett fel.
function lappaGraphicsDestroy() {
  const orig = Graphics.prototype.destroy
  Graphics.prototype.destroy = function destroy(options) {
    if (this._ownedContext && options && typeof options === 'object' && options.context === undefined) {
      this._ownedContext.destroy()
      this._ownedContext = null
    }
    return orig.call(this, options)
  }
}
