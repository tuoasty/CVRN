import { describe, expect, it } from 'vitest'
import { galleryHref, galleryKeyOf, galleryLabel, parseGalleryKey } from '../galleryKey'

describe('parseGalleryKey', () => {
    it('parses custom in any case and falls back to OUT', () => {
        expect(parseGalleryKey('custom')).toBe('CUSTOM')
        expect(parseGalleryKey('Custom')).toBe('CUSTOM')
        expect(parseGalleryKey('mb')).toBe('MID')
        expect(parseGalleryKey('nope')).toBe('OUT')
        expect(parseGalleryKey(null)).toBe('OUT')
        expect(parseGalleryKey(undefined)).toBe('OUT')
    })
})

describe('galleryHref', () => {
    it('drops the param for OUT and lowercases the rest', () => {
        expect(galleryHref('OUT')).toBe('/information/specs')
        expect(galleryHref('MID')).toBe('/information/specs?pos=mid')
        expect(galleryHref('CUSTOM')).toBe('/information/specs?pos=custom')
    })
})

describe('galleryLabel', () => {
    it('labels custom and positions', () => {
        expect(galleryLabel('CUSTOM')).toBe('Custom')
        expect(galleryLabel('SET')).toBe('Setter')
    })
})

describe('galleryKeyOf', () => {
    it('maps custom specs to CUSTOM and others to their position', () => {
        expect(galleryKeyOf({ is_custom: true, position: null })).toBe('CUSTOM')
        expect(galleryKeyOf({ is_custom: false, position: 'LIB' })).toBe('LIB')
        expect(galleryKeyOf({ is_custom: false, position: 'weird' })).toBe('OUT')
    })
})
