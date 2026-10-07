import { describe, expect, it } from 'vitest'
import {
    isValidImageName,
    parseImageToken,
    referencedImageNames,
    renameImageTokens,
    slugImageName,
    uniqueImageName,
} from '../imageTokens'

describe('isValidImageName', () => {
    it('accepts lowercase words joined by single dashes', () => {
        expect(isValidImageName('spike-rework')).toBe(true)
        expect(isValidImageName('map2')).toBe(true)
    })

    it('rejects uppercase, spaces, colons, edge or double dashes and long names', () => {
        for (const bad of ['Spike', 'spike rework', 'a:b', '-a', 'a-', 'a--b', '', 'a'.repeat(41)]) {
            expect(isValidImageName(bad)).toBe(false)
        }
    })
})

describe('parseImageToken', () => {
    it('reads a bare token as centered', () => {
        expect(parseImageToken('[image:new-map]')).toEqual({ name: 'new-map', placement: 'center', width: undefined })
    })

    it('reads placement and width in either order', () => {
        expect(parseImageToken('[image:a:left:50]')).toEqual({ name: 'a', placement: 'left', width: 50 })
        expect(parseImageToken('[image:a:75:right]')).toEqual({ name: 'a', placement: 'right', width: 75 })
    })

    it('lowercases the name and ignores surrounding whitespace', () => {
        expect(parseImageToken('  [IMAGE:New-Map]  ')?.name).toBe('new-map')
    })

    it('rejects anything that is not exactly one token', () => {
        expect(parseImageToken('see [image:a]')).toBeNull()
        expect(parseImageToken('[image:a] [image:b]')).toBeNull()
        expect(parseImageToken('[image:a:top]')).toBeNull()
        expect(parseImageToken('[cover]')).toBeNull()
    })
})

describe('referencedImageNames', () => {
    it('counts tokens that sit on their own line, in lists and in quotes', () => {
        const body = '[image:a]\n- [image:b]\n  [image:a:left]\n> [image:c]\n1. [image:b]'
        expect(Object.fromEntries(referencedImageNames(body))).toEqual({ a: 2, b: 2, c: 1 })
    })

    it('ignores tokens in the middle of a sentence', () => {
        expect(referencedImageNames('see [image:a] here').size).toBe(0)
    })

    it('handles CRLF bodies', () => {
        expect(referencedImageNames('x\r\n[image:a]\r\n').get('a')).toBe(1)
    })
})

describe('renameImageTokens', () => {
    it('renames every token for that name and keeps its modifiers', () => {
        expect(renameImageTokens('[image:a]\ntext [image:a:left:50]\n[image:ab]', 'a', 'map'))
            .toBe('[image:map]\ntext [image:map:left:50]\n[image:ab]')
    })
})

describe('slugImageName', () => {
    it('slugs a file name without its extension', () => {
        expect(slugImageName('New Map (Final).PNG')).toBe('new-map-final')
        expect(slugImageName('café_über.webp')).toBe('cafe-uber')
    })

    it('falls back to image when nothing usable is left', () => {
        expect(slugImageName('.png')).toBe('image')
        expect(slugImageName('スクショ.png')).toBe('image')
    })

    it('caps the length without a trailing dash', () => {
        const name = slugImageName(`${'a'.repeat(39)}-b.png`)
        expect(name.length).toBeLessThanOrEqual(40)
        expect(name.endsWith('-')).toBe(false)
    })
})

describe('uniqueImageName', () => {
    it('keeps a free name and suffixes a taken one', () => {
        expect(uniqueImageName('image', new Set())).toBe('image')
        expect(uniqueImageName('image', new Set(['image', 'image-2']))).toBe('image-3')
    })

    it('stays within the length limit when suffixing', () => {
        const base = 'a'.repeat(40)
        const name = uniqueImageName(base, new Set([base]))
        expect(name).toBe(`${'a'.repeat(38)}-2`)
    })
})
