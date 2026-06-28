// Liten DOM-overlay för text-inmatning (t.ex. namnge en profil).
// Detta är det enda stället vi använder DOM ovanpå canvasen, eftersom
// textinmatning kräver OS-tangentbordet. Visas alltid bakom föräldra-grinden.
export function promptText({ title = 'Skriv ett namn', value = '', placeholder = '', maxLength = 16 } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'dom-modal'

    const card = document.createElement('div')
    card.className = 'dom-modal__card'

    const h = document.createElement('div')
    h.className = 'dom-modal__title'
    h.textContent = title

    const input = document.createElement('input')
    input.className = 'dom-modal__input'
    input.type = 'text'
    input.value = value
    input.placeholder = placeholder
    input.maxLength = maxLength
    input.autocomplete = 'off'

    const row = document.createElement('div')
    row.className = 'dom-modal__row'
    const cancel = document.createElement('button')
    cancel.className = 'dom-modal__btn dom-modal__btn--cancel'
    cancel.textContent = 'Avbryt'
    const ok = document.createElement('button')
    ok.className = 'dom-modal__btn dom-modal__btn--ok'
    ok.textContent = 'Klar'
    row.append(cancel, ok)

    card.append(h, input, row)
    overlay.append(card)
    document.body.append(overlay)

    const close = (val) => {
      overlay.remove()
      resolve(val)
    }
    const submit = () => {
      const v = input.value.trim()
      close(v ? v : null)
    }
    ok.addEventListener('click', submit)
    cancel.addEventListener('click', () => close(null))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit()
      else if (e.key === 'Escape') close(null)
    })
    setTimeout(() => {
      input.focus()
      input.select()
    }, 30)
  })
}
