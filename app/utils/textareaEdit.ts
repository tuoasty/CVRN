export interface TextEdit {
    from: number
    to: number
    insert: string
    selStart: number
    selEnd: number
}

export function applyTextareaEdit(el: HTMLTextAreaElement, edit: TextEdit, onFallback: (value: string) => void): void {
    el.focus()
    el.setSelectionRange(edit.from, edit.to)

    const applied = edit.insert === ''
        ? document.execCommand('delete')
        : document.execCommand('insertText', false, edit.insert)

    if (applied) {
        el.setSelectionRange(edit.selStart, edit.selEnd)
        return
    }

    onFallback(el.value.slice(0, edit.from) + edit.insert + el.value.slice(edit.to))
    requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(edit.selStart, edit.selEnd)
    })
}
