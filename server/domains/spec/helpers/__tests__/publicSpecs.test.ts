import { describe, expect, it } from 'vitest'
import type { Season } from '@/shared/types/db'
import type { PublicSpecRow } from '@/server/db/specs.repo'
import { customGallery, galleryFor, parseGalleryPosition, pickRequirementRegion, seasonForRegion, withSpecSlugs } from '../publicSpecs'

function row(patch: Partial<PublicSpecRow>): PublicSpecRow {
    return { id: patch.name ?? 'x', name: 'Spec', stars: 3, position: 'OUT', height: 78, is_vaulted: false, is_custom: false, game_key: null, photo_url: null, created_at: '2026-01-01T00:00:00Z', ...patch }
}

function season(patch: Partial<Season>): Season {
    return {
        id: 's', region_id: 'na', name: 'Season', slug: 's1', start_date: '2026-01-01', end_date: null, created_at: '', updated_at: '',
        league_type: 'main', max_players: 10, playoff_completed: false, playoff_config_id: null, playoff_started: false, season_number: 1, theme: null, weeks: null,
        ...patch,
    } as Season
}

const published = [
    { regionId: 'sa-id', code: 'SA', name: 'South America' },
    { regionId: 'eu-id', code: 'EU', name: 'Europe' },
    { regionId: 'na-id', code: 'NA', name: 'North America' },
]

describe('withSpecSlugs', () => {
    it('slugs by name, accent-stripped', () => {
        expect(withSpecSlugs([row({ id: 'a', name: 'Wilfredo León' })])[0].slug).toBe('wilfredo-leon')
    })

    it('suffixes collisions in created_at order', () => {
        const cards = withSpecSlugs([
            row({ id: 'late', name: 'Leon', created_at: '2026-03-01T00:00:00Z' }),
            row({ id: 'early', name: 'León', created_at: '2026-01-01T00:00:00Z' }),
            row({ id: 'mid', name: 'leon', created_at: '2026-02-01T00:00:00Z' }),
        ])
        expect(Object.fromEntries(cards.map(c => [c.id, c.slug]))).toEqual({ early: 'leon', mid: 'leon-2', late: 'leon-3' })
    })

    it('never reuses a slug a real name already takes', () => {
        const cards = withSpecSlugs([
            row({ id: 'a', name: 'Leon 2', created_at: '2026-01-01T00:00:00Z' }),
            row({ id: 'b', name: 'Leon', created_at: '2026-02-01T00:00:00Z' }),
            row({ id: 'c', name: 'Leon', created_at: '2026-03-01T00:00:00Z' }),
        ])
        expect(new Set(cards.map(c => c.slug)).size).toBe(3)
    })

    it('keeps the input order', () => {
        const cards = withSpecSlugs([row({ id: 'b', name: 'B' }), row({ id: 'a', name: 'A' })])
        expect(cards.map(c => c.id)).toEqual(['b', 'a'])
    })
})

describe('galleryFor', () => {
    const cards = withSpecSlugs([
        row({ id: '1', name: 'Zed', stars: 3 }),
        row({ id: '2', name: 'Amy', stars: 5 }),
        row({ id: '3', name: 'Bob', stars: 5 }),
        row({ id: '4', name: 'Old', stars: 5, is_vaulted: true }),
        row({ id: '5', name: 'Set', position: 'SET' }),
    ])

    it('sorts stars high to low, then name, for one position', () => {
        expect(galleryFor(cards, 'OUT').active.map(c => c.name)).toEqual(['Amy', 'Bob', 'Zed'])
    })

    it('sorts vaulted specs into their own group', () => {
        const gallery = galleryFor(cards, 'OUT')
        expect(gallery.vaulted.map(c => c.name)).toEqual(['Old'])
        expect(gallery.active.some(c => c.is_vaulted)).toBe(false)
    })
})

describe('parseGalleryPosition', () => {
    it.each([
        ['oh', 'OUT'],
        ['out', 'OUT'],
        ['mb', 'MID'],
        ['lib', 'LIB'],
        ['garbage', 'OUT'],
        [undefined, 'OUT'],
    ])('%s -> %s', (raw, code) => {
        expect(parseGalleryPosition(raw)).toBe(code)
    })
})

describe('pickRequirementRegion', () => {
    it('prefers the query code', () => {
        expect(pickRequirementRegion({ published, query: 'eu', cookie: 'sa:s3' })?.code).toBe('EU')
    })

    it('falls back to the cookie region', () => {
        expect(pickRequirementRegion({ published, cookie: 'eu:s6' })?.code).toBe('EU')
    })

    it('ignores an unpublished query or cookie region', () => {
        expect(pickRequirementRegion({ published, query: 'as', cookie: 'as:s1' })?.code).toBe('NA')
    })

    it('falls back to NA, then the first region in region order', () => {
        expect(pickRequirementRegion({ published })?.code).toBe('NA')
        expect(pickRequirementRegion({ published: published.filter(r => r.code !== 'NA') })?.code).toBe('EU')
    })

    it('returns null with nothing published', () => {
        expect(pickRequirementRegion({ published: [] })).toBeNull()
    })
})

describe('seasonForRegion', () => {
    const past = '2020-01-01'

    it('picks the active season of the region', () => {
        const seasons = [season({ id: 'old', end_date: past }), season({ id: 'live' }), season({ id: 'other', region_id: 'eu' })]
        expect(seasonForRegion('na', seasons)?.id).toBe('live')
    })

    it('falls back to the most recent season when none is active', () => {
        const seasons = [
            season({ id: 'older', start_date: '2025-01-01', end_date: past }),
            season({ id: 'recent', start_date: '2025-06-01', end_date: past }),
        ]
        expect(seasonForRegion('na', seasons)?.id).toBe('recent')
    })

    it('returns null for a region with no seasons', () => {
        expect(seasonForRegion('as', [season({})])).toBeNull()
    })
})

describe('customGallery', () => {
    it('keeps custom specs out of position galleries and sorts them by name', () => {
        const cards = withSpecSlugs([
            row({ id: 'l', name: 'League', position: 'OUT' }),
            row({ id: 'z', name: 'Zed', position: null, stars: null, is_custom: true }),
            row({ id: 'b', name: 'Blitz', position: null, stars: null, is_custom: true }),
        ])
        expect(galleryFor(cards, 'OUT').active.map(c => c.id)).toEqual(['l'])
        expect(customGallery(cards).map(c => c.id)).toEqual(['b', 'z'])
    })
})
