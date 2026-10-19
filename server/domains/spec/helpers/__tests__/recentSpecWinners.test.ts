import { describe, expect, it } from 'vitest'
import { latestEndedSeasons, winnersForSpec, type RecentSpecWinners } from '../recentSpecWinners'

const now = new Date('2026-10-19T00:00:00Z')

function season(id: string, region_id: string, end_date: string | null) {
    return { id, region_id, name: `Season ${id}`, slug: id, end_date }
}

const player = { id: 'p1', username: 'ace', display_name: null, avatar_url: null }

describe('latestEndedSeasons', () => {
    it('skips seasons with no end date or an end date in the future', () => {
        const picked = latestEndedSeasons([season('live', 'na', null), season('soon', 'na', '2026-12-01'), season('done', 'na', '2026-09-01')], now)
        expect(picked.get('na')?.map(s => s.id)).toEqual(['done'])
    })

    it('picks the two latest by end date per region, newest first', () => {
        const picked = latestEndedSeasons([
            season('s1', 'na', '2025-01-01'),
            season('s3', 'na', '2026-06-01'),
            season('s2', 'na', '2025-08-01'),
            season('e1', 'eu', '2026-01-01'),
        ], now)
        expect(picked.get('na')?.map(s => s.id)).toEqual(['s3', 's2'])
        expect(picked.get('eu')?.map(s => s.id)).toEqual(['e1'])
    })

    it('maps to name, slug and endDate', () => {
        const picked = latestEndedSeasons([season('s1', 'na', '2025-01-01')], now)
        expect(picked.get('na')?.[0]).toEqual({ id: 's1', name: 'Season s1', slug: 's1', endDate: '2025-01-01' })
    })
})

describe('winnersForSpec', () => {
    const recent: RecentSpecWinners = {
        seasonsByRegion: {
            na: [
                { id: 'new', name: 'S9', slug: 's9', endDate: '2026-09-01' },
                { id: 'old', name: 'S8', slug: 's8', endDate: '2026-03-01' },
            ],
        },
        winners: [
            { season_id: 'old', spec_id: 'leon', stars_awarded: 4, player },
            { season_id: 'old', spec_id: 'other', stars_awarded: 5, player },
        ],
    }

    it('returns null for an unawarded newest season and the winner for the older one', () => {
        expect(winnersForSpec(recent, 'leon')).toEqual({
            na: [
                { season: recent.seasonsByRegion.na[0], winner: null },
                { season: recent.seasonsByRegion.na[1], winner: { starsAwarded: 4, player } },
            ],
        })
    })

    it('ignores other specs', () => {
        expect(winnersForSpec(recent, 'nobody').na.every(e => e.winner === null)).toBe(true)
    })

    it('coalesces a stale cached shape', () => {
        expect(winnersForSpec({} as RecentSpecWinners, 'leon')).toEqual({})
        expect(winnersForSpec({ seasonsByRegion: recent.seasonsByRegion } as RecentSpecWinners, 'leon').na[1].winner).toBeNull()
    })
})
