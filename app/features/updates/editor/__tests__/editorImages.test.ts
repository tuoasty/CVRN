import { describe, expect, it } from 'vitest'
import { diffImages, imagesDirty, renameError, tokenInsertEdit, type EditorImage } from '../editorImages'

function saved(id: string, name: string, caption = ''): EditorImage {
    return { key: id, id, name, caption, url: `https://cdn/${id}.webp`, file: null }
}

function pending(key: string, name: string): EditorImage {
    return { key, id: null, name, caption: '', url: `blob:${key}`, file: new File(['x'], `${name}.webp`) }
}

describe('diffImages', () => {
    const base = [saved('1', 'map'), saved('2', 'serve', 'Old caption')]

    it('reports nothing when the draft matches what was saved', () => {
        expect(imagesDirty(base, base)).toBe(false)
    })

    it('reports renames and caption edits as changes', () => {
        const draft = [{ ...base[0], name: 'new-map' }, { ...base[1], caption: '  New caption ' }]
        expect(diffImages(draft, base).changes).toEqual([
            { id: '1', name: 'new-map', caption: null },
            { id: '2', name: 'serve', caption: 'New caption' },
        ])
    })

    it('treats an empty caption and whitespace as the same', () => {
        expect(imagesDirty([{ ...base[0], caption: '   ' }, base[1]], base)).toBe(false)
    })

    it('reports saved images that left the draft as removed', () => {
        expect(diffImages([base[1]], base).removedIds).toEqual(['1'])
    })

    it('reports pending images and counts them as dirty', () => {
        const draft = [...base, pending('p1', 'image')]
        expect(diffImages(draft, base).pending.map(p => p.key)).toEqual(['p1'])
        expect(imagesDirty(draft, base)).toBe(true)
    })
})

describe('tokenInsertEdit', () => {
    it('puts the token on its own line in the middle of text', () => {
        const edit = tokenInsertEdit('before after', 6, 6, ['map'])
        expect(edit.insert).toBe('\n[image:map]\n')
        expect(edit.selStart).toBe(6 + '\n[image:map]'.length)
    })

    it('adds no extra newlines at line edges or the ends of the body', () => {
        expect(tokenInsertEdit('', 0, 0, ['map']).insert).toBe('[image:map]')
        expect(tokenInsertEdit('a\n\nb', 2, 2, ['map']).insert).toBe('[image:map]')
    })

    it('stacks several tokens on separate lines and replaces a selection', () => {
        const edit = tokenInsertEdit('aXXb', 1, 3, ['one', 'two'])
        expect(edit).toMatchObject({ from: 1, to: 3, insert: '\n[image:one]\n[image:two]\n' })
    })
})

describe('renameError', () => {
    const images = [saved('1', 'map'), saved('2', 'serve')]

    it('accepts a valid free name, ignoring case and spaces around it', () => {
        expect(renameError('  New-Map ', '1', images)).toBeNull()
    })

    it('rejects invalid names and names used by another image', () => {
        expect(renameError('new map', '1', images)).toMatch(/lowercase/)
        expect(renameError('serve', '1', images)).toMatch(/already/)
        expect(renameError('map', '1', images)).toBeNull()
    })
})
