export type ImagePlacement = 'left' | 'center' | 'right'
export type ImageWidth = 25 | 50 | 75

export interface ImageToken {
    name: string
    placement: ImagePlacement
    width?: ImageWidth
}

export const IMAGE_NAME_MAX = 40
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const IMAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const NAME = '[a-z0-9]+(?:-[a-z0-9]+)*'
const MODIFIERS = '((?::(?:left|center|right|25|50|75)){0,2})'
const TOKEN_ONLY = new RegExp(`^\\[image:(${NAME})${MODIFIERS}\\]$`, 'i')
const TOKEN_LINE = new RegExp(`^[ \\t]*(?:>[ \\t]*)*(?:(?:[-*+]|\\d{1,9}[.)])[ \\t]+)?\\[image:(${NAME})${MODIFIERS}\\][ \\t]*$`, 'i')

function tokenAnywhere(name: string): RegExp {
    return new RegExp(`\\[image:${name}${MODIFIERS}\\]`, 'gi')
}

export function isValidImageName(name: string): boolean {
    return name.length <= IMAGE_NAME_MAX && IMAGE_NAME_PATTERN.test(name)
}

function parseModifiers(raw: string): Pick<ImageToken, 'placement' | 'width'> {
    let placement: ImagePlacement = 'center'
    let width: ImageWidth | undefined
    for (const part of raw.toLowerCase().split(':')) {
        if (part === 'left' || part === 'center' || part === 'right') placement = part
        else if (part === '25' || part === '50' || part === '75') width = Number(part) as ImageWidth
    }
    return { placement, width }
}

export function parseImageToken(text: string): ImageToken | null {
    const m = TOKEN_ONLY.exec(text.trim())
    if (!m) return null
    return { name: m[1].toLowerCase(), ...parseModifiers(m[2] ?? '') }
}

export function imageToken(name: string): string {
    return `[image:${name}]`
}

export function referencedImageNames(body: string): Map<string, number> {
    const counts = new Map<string, number>()
    for (const line of body.split(/\r\n|\r|\n/)) {
        const m = TOKEN_LINE.exec(line)
        if (!m) continue
        const name = m[1].toLowerCase()
        counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return counts
}

export function renameImageTokens(body: string, from: string, to: string): string {
    return body.replace(tokenAnywhere(from), (_, modifiers: string) => `[image:${to}${modifiers ?? ''}]`)
}

export function slugImageName(fileName: string): string {
    const slug = fileName
        .replace(/\.[^.]*$/, '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, IMAGE_NAME_MAX)
        .replace(/-+$/, '')
    return slug || 'image'
}

export function uniqueImageName(base: string, taken: Set<string>): string {
    if (!taken.has(base)) return base
    for (let n = 2; ; n++) {
        const suffix = `-${n}`
        const candidate = `${base.slice(0, IMAGE_NAME_MAX - suffix.length).replace(/-+$/, '')}${suffix}`
        if (!taken.has(candidate)) return candidate
    }
}
