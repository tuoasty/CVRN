import {describe, it, expect} from 'vitest'
import {DBClient} from '@/shared/types/db'
import {getSeasonFinalsSlots} from '../getSeasonFinalsSlots'

type MatchRow = {
    home_team_id: string | null
    away_team_id: string | null
    home_sets_won: number | null
    away_sets_won: number | null
}

/**
 * Minimal stand-in for the two query shapes this file issues: `playoff_brackets`
 * filtered by season + round, and `matches` filtered by id. Building the real client is
 * not worth it — the logic under test is entirely about which round it reads and which
 * side of the result it takes.
 */
function stubClient(brackets: Record<string, string | string[]>, matches: Record<string, MatchRow>): DBClient {
    return {
        from(table: string) {
            const filters: Record<string, string> = {}
            const builder = {
                select: () => builder,
                eq(column: string, value: string) {
                    filters[column] = value
                    return builder
                },
                maybeSingle() {
                    if (table === 'playoff_brackets') {
                        const hit = brackets[filters.round]
                        const matchId = Array.isArray(hit) ? hit[0] : hit
                        return Promise.resolve({data: matchId ? {match_id: matchId} : null})
                    }
                    return Promise.resolve({data: matches[filters.id] ?? null})
                },
                // Unawaited `.eq()` chains resolve here — only the semifinal list does this.
                then(resolve: (r: {data: {match_id: string}[]}) => unknown) {
                    const hit = brackets[filters.round] ?? []
                    const ids = Array.isArray(hit) ? hit : [hit]
                    return Promise.resolve({data: ids.map(match_id => ({match_id}))}).then(resolve)
                },
            }
            return builder
        },
    } as unknown as DBClient
}

const played = (home: string, away: string, homeSets: number, awaySets: number): MatchRow => ({
    home_team_id: home,
    away_team_id: away,
    home_sets_won: homeSets,
    away_sets_won: awaySets,
})

const unplayed = (home: string | null, away: string | null): MatchRow => ({
    home_team_id: home,
    away_team_id: away,
    home_sets_won: null,
    away_sets_won: null,
})

const unwrap = async (client: DBClient) => {
    const result = await getSeasonFinalsSlots(client, 'season-1')
    if (!result.ok) throw new Error('expected Ok')
    return result.value
}

describe('getSeasonFinalsSlots', () => {
    describe('double elimination', () => {
        it('reads the upper finalist from the grand final home slot', async () => {
            const slots = await unwrap(
                stubClient(
                    {grand_final: 'gf', losers_final: 'lf'},
                    {gf: played('upper', 'lower', 3, 1), lf: played('lower', 'bronze', 3, 0)}
                )
            )
            expect(slots).toEqual({
                upperFinalistTeamId: 'upper',
                finalistTeamIds: ['lower'],
                thirdTeamId: 'bronze',
            })
        })

        // The case the whole rework exists for. `lower` wins the championship; `upper` is
        // still the team that skipped the lower bracket, so it keeps the upper slot.
        it('keeps the upper slot when the lower bracket team wins the grand final', async () => {
            const slots = await unwrap(
                stubClient(
                    {grand_final: 'gf', bracket_reset: 'br', losers_final: 'lf'},
                    {
                        gf: played('upper', 'lower', 1, 3),
                        br: played('lower', 'upper', 3, 2),
                        lf: played('lower', 'bronze', 3, 0),
                    }
                )
            )
            expect(slots.upperFinalistTeamId).toBe('upper')
            expect(slots.finalistTeamIds).toEqual(['lower'])
        })

        it('reports finalists before the grand final has been played', async () => {
            const slots = await unwrap(
                stubClient({grand_final: 'gf'}, {gf: unplayed('upper', 'lower')})
            )
            expect(slots.upperFinalistTeamId).toBe('upper')
            expect(slots.finalistTeamIds).toEqual(['lower'])
            expect(slots.thirdTeamId).toBeNull()
        })

        it('has no third place while the losers final is unresolved', async () => {
            const slots = await unwrap(
                stubClient(
                    {grand_final: 'gf', losers_final: 'lf'},
                    {gf: played('upper', 'lower', 3, 0), lf: unplayed('lower', 'bronze')}
                )
            )
            expect(slots.thirdTeamId).toBeNull()
        })
    })

    describe('single elimination', () => {
        it('has no upper finalist and puts both finalists in the neutral band', async () => {
            const slots = await unwrap(
                stubClient(
                    {final: 'f', third_place: 'tp'},
                    {f: played('winner', 'runnerUp', 3, 1), tp: played('bronze', 'fourth', 3, 0)}
                )
            )
            expect(slots).toEqual({
                upperFinalistTeamId: null,
                finalistTeamIds: ['winner', 'runnerUp'],
                thirdTeamId: 'bronze',
            })
        })

        it('falls back to a semifinal loser when there is no third-place match', async () => {
            const slots = await unwrap(
                stubClient(
                    {final: 'f', semifinal: ['sf1', 'sf2']},
                    {
                        f: played('winner', 'runnerUp', 3, 1),
                        sf1: played('winner', 'sfLoser', 3, 0),
                        sf2: played('runnerUp', 'otherLoser', 3, 0),
                    }
                )
            )
            expect(slots.thirdTeamId).toBe('sfLoser')
        })
    })

    it('returns no slots when the season has no final of either shape', async () => {
        const slots = await unwrap(stubClient({}, {}))
        expect(slots).toEqual({
            upperFinalistTeamId: null,
            finalistTeamIds: [],
            thirdTeamId: null,
        })
    })
})
