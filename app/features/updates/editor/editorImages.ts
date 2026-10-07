import type { TextEdit } from '@/app/utils/textareaEdit'
import { imageToken, isValidImageName, IMAGE_NAME_MAX } from '@/shared/utils/imageTokens'

export interface EditorImage {
    key: string
    id: string | null
    name: string
    caption: string
    url: string
    file: File | null
}

export interface SavedImageInput {
    id: string
    name: string
    url: string
    caption: string | null
}

export interface ImageChange {
    id: string
    name: string
    caption: string | null
}

export function fromSavedImage(image: SavedImageInput): EditorImage {
    return { key: image.id, id: image.id, name: image.name, caption: image.caption ?? '', url: image.url, file: null }
}

function normalizedCaption(caption: string): string | null {
    const trimmed = caption.trim()
    return trimmed === '' ? null : trimmed
}

export function diffImages(images: EditorImage[], saved: EditorImage[]): { changes: ImageChange[]; removedIds: string[]; pending: EditorImage[] } {
    const savedById = new Map(saved.map(image => [image.id, image]))
    const changes: ImageChange[] = []
    for (const image of images) {
        if (!image.id) continue
        const before = savedById.get(image.id)
        if (!before) continue
        const caption = normalizedCaption(image.caption)
        if (image.name !== before.name || caption !== normalizedCaption(before.caption)) {
            changes.push({ id: image.id, name: image.name, caption })
        }
    }
    const kept = new Set(images.map(image => image.id).filter(Boolean))
    const removedIds = saved.map(image => image.id!).filter(id => !kept.has(id))
    return { changes, removedIds, pending: images.filter(image => !image.id) }
}

export function imagesDirty(images: EditorImage[], saved: EditorImage[]): boolean {
    const { changes, removedIds, pending } = diffImages(images, saved)
    return changes.length > 0 || removedIds.length > 0 || pending.length > 0
}

export function tokenInsertEdit(value: string, selectionStart: number, selectionEnd: number, names: string[]): TextEdit {
    const from = Math.min(selectionStart, selectionEnd)
    const to = Math.max(selectionStart, selectionEnd)
    const text = names.map(imageToken).join('\n')
    const before = value.slice(0, from)
    const after = value.slice(to)
    const lead = before === '' || before.endsWith('\n') ? '' : '\n'
    const trail = after === '' || after.startsWith('\n') ? '' : '\n'
    const caret = from + lead.length + text.length
    return { from, to, insert: lead + text + trail, selStart: caret, selEnd: caret }
}

export function renameError(raw: string, key: string, images: EditorImage[]): string | null {
    const name = raw.trim().toLowerCase()
    if (!isValidImageName(name)) return `Use lowercase letters, numbers and single dashes (max ${IMAGE_NAME_MAX})`
    if (images.some(image => image.key !== key && image.name === name)) return 'Another image already uses that name'
    return null
}
