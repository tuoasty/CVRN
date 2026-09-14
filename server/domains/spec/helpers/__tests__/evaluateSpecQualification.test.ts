import {describe, it, expect} from 'vitest'
import {PlayerLeaderboardRow} from '@/server/domains/player'
import {evaluateSpecQualification, EvaluableRequirement} from '../evaluateSpecQualification'
import type {PlacementBonusConfig} from '../placementBonus'

const cfg: PlacementBonusConfig = {
    upperFinalist: 0.25,
    ladder: [0.1, 0.075, 0.05, 0.025, 0, 0, 0, 0],
    outside: -0.1,
    scope: {count: true, per_set: false, pct: false},
}

function player(username: string, stats: Partial<Record<string, number | null>> = {}): PlayerLeaderboardRow {
    return {
        player_id: `id-${username}`,
        username,
        display_name: null,
        avatar_url: null,
        region_id: 'region-1',
        team_id: null,
        team_name: null,
        team_slug: null,
        team_logo_url: null,
        team_logo_bg_removed: null,
        season_id: 'season-1',
        season_name: 'Season 1',
        season_slug: 's1',
        region_code: 'NA',
        ...stats,
    } as unknown as PlayerLeaderboardRow
}

const main = (statKey: string, minValue: number): EvaluableRequirement => ({tier: 'main', statKey, minValue})
const secondary = (statKey: string, minValue: number): EvaluableRequirement => ({tier: 'secondary', statKey, minValue})

describe('evaluateSpecQualification', () => {
    it('qualifies a player who clears every main requirement', () => {
        const {rows} = evaluateSpecQualification(
            [player('ace', {points_total: 60, kills_total: 45})],
            [main('points_total', 50), main('kills_total', 40)],
            0
        )
        expect(rows[0].qualified).toBe(true)
        expect(rows[0].mainPassed).toBe(2)
    })

    it('disqualifies a player who misses one main requirement', () => {
        const {rows} = evaluateSpecQualification(
            [player('mid', {points_total: 60, kills_total: 39})],
            [main('points_total', 50), main('kills_total', 40)],
            0
        )
        expect(rows[0].qualified).toBe(false)
        expect(rows[0].mainPassed).toBe(1)
    })

    it('treats the threshold as inclusive', () => {
        const {rows} = evaluateSpecQualification(
            [player('exact', {points_total: 50})],
            [main('points_total', 50)],
            0
        )
        expect(rows[0].qualified).toBe(true)
    })

    it('fails a null stat even against a zero threshold', () => {
        const {rows} = evaluateSpecQualification(
            [player('benched', {hit_eff: null})],
            [main('hit_eff', 0)],
            0
        )
        expect(rows[0].qualified).toBe(false)
        expect(rows[0].checks[0].value).toBeNull()
        expect(rows[0].checks[0].passed).toBe(false)
    })

    describe('secondary N-of-M', () => {
        const reqs = [
            main('points_total', 10),
            secondary('aces_total', 5),
            secondary('digs_total', 5),
            secondary('assists_total', 5),
        ]

        it('qualifies at exactly N', () => {
            const {rows} = evaluateSpecQualification(
                [player('two', {points_total: 20, aces_total: 9, digs_total: 9, assists_total: 0})],
                reqs,
                2
            )
            expect(rows[0].secondaryPassed).toBe(2)
            expect(rows[0].qualified).toBe(true)
        })

        it('disqualifies at N minus one', () => {
            const {rows} = evaluateSpecQualification(
                [player('one', {points_total: 20, aces_total: 9, digs_total: 0, assists_total: 0})],
                reqs,
                2
            )
            expect(rows[0].secondaryPassed).toBe(1)
            expect(rows[0].qualified).toBe(false)
        })

        it('still requires every main requirement regardless of secondary count', () => {
            const {rows} = evaluateSpecQualification(
                [player('lopsided', {points_total: 0, aces_total: 9, digs_total: 9, assists_total: 9})],
                reqs,
                2
            )
            expect(rows[0].secondaryPassed).toBe(3)
            expect(rows[0].qualified).toBe(false)
        })
    })

    it('reports unknown stat keys and qualifies nobody', () => {
        const {rows, unknownStatKeys} = evaluateSpecQualification(
            [player('anyone', {points_total: 999})],
            [main('points_total', 10), main('not_a_real_stat', 1)],
            0
        )
        expect(unknownStatKeys).toEqual(['not_a_real_stat'])
        expect(rows[0].qualified).toBe(false)

        expect(rows[0].checks).toHaveLength(1)
    })

    it('qualifies everyone when there are no requirements at all', () => {
        const {rows} = evaluateSpecQualification([player('empty')], [], 0)
        expect(rows[0].qualified).toBe(true)
    })

    it('recognizes the split ace stat keys as known requirements', () => {
        const {rows, unknownStatKeys} = evaluateSpecQualification(
            [player('server', {jump_serve_aces_total: 8, float_aces_total: 3})],
            [main('jump_serve_aces_total', 5), main('float_aces_total', 2)],
            0
        )
        expect(unknownStatKeys).toEqual([])
        expect(rows[0].mainPassed).toBe(2)
        expect(rows[0].qualified).toBe(true)
    })

    it('treats the retired serve_receives_total as an unknown stat key', () => {
        const {rows, unknownStatKeys} = evaluateSpecQualification(
            [player('anyone', {points_total: 999})],
            [main('serve_receives_total', 1)],
            0
        )
        expect(unknownStatKeys).toEqual(['serve_receives_total'])
        expect(rows[0].qualified).toBe(false)
    })

    describe('placement bonus', () => {
        const onTeam = (username: string, teamId: string, stats: Record<string, number>) => ({
            ...player(username, stats),
            team_id: teamId,
        })

        // Double-elim: 'lower' won the grand final (1st), 'upper' lost it (2nd, upper finalist), 'third' 3rd.
        const placeByTeamId = new Map<string, number>([
            ['lower', 1],
            ['upper', 2],
            ['third', 3],
        ])
        const opts = {bonusConfig: cfg, placeByTeamId, upperFinalistTeamId: 'upper'}

        it('is not applied when no bonus config is given', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('a', 'upper', {points_total: 100})],
                [main('points_total', 110)],
                0,
                {placeByTeamId, upperFinalistTeamId: 'upper'}
            )
            expect(rows[0].placementBonus).toBe(0)
            expect(rows[0].qualified).toBe(false)
        })

        it('stacks the upper-final band on top of the finish ladder', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('runnerUp', 'upper', {points_total: 100})],
                [main('points_total', 110)],
                0,
                opts
            )
            expect(rows[0].place).toBe(2)
            expect(rows[0].isUpperFinalist).toBe(true)
            expect(rows[0].placementBonus).toBeCloseTo(0.325)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(132.5)
            expect(rows[0].qualified).toBe(true)
        })

        it('gives the lower-bracket champion the 1st-place ladder only, no upper band', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('champ', 'lower', {points_total: 100})],
                [main('points_total', 110)],
                0,
                opts
            )
            expect(rows[0].place).toBe(1)
            expect(rows[0].isUpperFinalist).toBe(false)
            expect(rows[0].placementBonus).toBeCloseTo(0.1)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(110)
            expect(rows[0].qualified).toBe(true)
        })

        it('applies the ladder rung for a mid placement', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('bronze', 'third', {points_total: 100})],
                [main('points_total', 105)],
                0,
                opts
            )
            expect(rows[0].place).toBe(3)
            expect(rows[0].placementBonus).toBeCloseTo(0.05)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(105)
            expect(rows[0].qualified).toBe(true)
        })

        it('penalises a player whose team is outside the podium', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('nobody', 'eliminated-early', {points_total: 100})],
                [main('points_total', 95)],
                0,
                opts
            )
            expect(rows[0].place).toBeNull()
            expect(rows[0].isUpperFinalist).toBe(false)
            expect(rows[0].placementBonus).toBeCloseTo(-0.1)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(90)
            expect(rows[0].qualified).toBe(false)
        })

        it('gives the upper finalist the full band, never the outside penalty, before a podium exists', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('runnerUp', 'upper', {points_total: 100})],
                [main('points_total', 120)],
                0,
                {bonusConfig: cfg, placeByTeamId: new Map(), upperFinalistTeamId: 'upper'}
            )
            expect(rows[0].place).toBeNull()
            expect(rows[0].isUpperFinalist).toBe(true)
            expect(rows[0].placementBonus).toBeCloseTo(0.25)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(125)
            expect(rows[0].qualified).toBe(true)
        })

        it('gives no upper band when the season has no upper finalist', () => {
            const singleElim = new Map<string, number>([
                ['finalistA', 1],
                ['finalistB', 2],
            ])
            const {rows} = evaluateSpecQualification(
                [
                    onTeam('a', 'finalistA', {points_total: 100}),
                    onTeam('b', 'finalistB', {points_total: 100}),
                ],
                [main('points_total', 100)],
                0,
                {bonusConfig: cfg, placeByTeamId: singleElim, upperFinalistTeamId: null}
            )
            expect(rows.every(r => !r.isUpperFinalist)).toBe(true)
            expect(rows.map(r => r.placementBonus).sort()).toEqual([0.075, 0.1])
        })

        it('never scales a per-set stat, only totals', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('runnerUp', 'upper', {kills_total: 100, kills_per_set: 10})],
                [main('kills_total', 120), main('kills_per_set', 12)],
                0,
                opts
            )
            const total = rows[0].checks.find(c => c.statKey === 'kills_total')!
            const perSet = rows[0].checks.find(c => c.statKey === 'kills_per_set')!
            expect(total.adjustedValue).toBeCloseTo(132.5)
            expect(total.passed).toBe(true)
            expect(perSet.adjustedValue).toBe(10)
            expect(perSet.passed).toBe(false)
        })

        it('scales a per-set stat when scope.per_set is enabled', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('runnerUp', 'upper', {kills_per_set: 10})],
                [main('kills_per_set', 13)],
                0,
                {...opts, bonusConfig: {...cfg, scope: {count: false, per_set: true, pct: false}}}
            )
            const perSet = rows[0].checks.find(c => c.statKey === 'kills_per_set')!
            expect(perSet.adjustedValue).toBeCloseTo(13.25)
            expect(perSet.passed).toBe(true)
        })

        it('scales a percentage stat when scope.pct is enabled, and can exceed 1', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('runnerUp', 'upper', {hit_eff: 0.8})],
                [main('hit_eff', 1)],
                0,
                {...opts, bonusConfig: {...cfg, scope: {count: false, per_set: false, pct: true}}}
            )
            const eff = rows[0].checks.find(c => c.statKey === 'hit_eff')!
            expect(eff.adjustedValue).toBeCloseTo(1.06)
            expect(eff.passed).toBe(true)
        })

        it('leaves a total unscaled when scope.count is disabled', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('runnerUp', 'upper', {kills_total: 100})],
                [main('kills_total', 110)],
                0,
                {...opts, bonusConfig: {...cfg, scope: {count: false, per_set: false, pct: false}}}
            )
            const total = rows[0].checks.find(c => c.statKey === 'kills_total')!
            expect(total.adjustedValue).toBe(100)
            expect(total.passed).toBe(false)
        })

    })

    it('passes a lower-is-better stat at or under the cap', () => {
        const {rows} = evaluateSpecQualification(
            [player('clean', {errors_total: 8})],
            [main('errors_total', 10)],
            0
        )
        expect(rows[0].checks[0].passed).toBe(true)
        expect(rows[0].qualified).toBe(true)
    })

    it('fails a lower-is-better stat above the cap', () => {
        const {rows} = evaluateSpecQualification(
            [player('sloppy', {errors_total: 12})],
            [main('errors_total', 10)],
            0
        )
        expect(rows[0].checks[0].passed).toBe(false)
        expect(rows[0].qualified).toBe(false)
    })

    it('never scales a lower-is-better stat by placement bonus', () => {
        const {rows} = evaluateSpecQualification(
            [{...player('star', {errors_total: 10}), team_id: 'upper'}],
            [main('errors_total', 10)],
            0,
            {bonusConfig: cfg, placeByTeamId: new Map([['upper', 1]]), upperFinalistTeamId: 'upper'}
        )
        expect(rows[0].placementBonus).toBeCloseTo(0.35)
        expect(rows[0].checks[0].adjustedValue).toBe(10)
        expect(rows[0].qualified).toBe(true)
    })

    it('sorts qualified first, then by nearest miss', () => {
        const reqs = [main('points_total', 50), main('kills_total', 40), main('aces_total', 10)]
        const {rows} = evaluateSpecQualification(
            [
                player('missesTwo', {points_total: 60, kills_total: 0, aces_total: 0}),
                player('missesOne', {points_total: 60, kills_total: 45, aces_total: 0}),
                player('clears', {points_total: 60, kills_total: 45, aces_total: 12}),
            ],
            reqs,
            0
        )
        expect(rows.map(r => r.username)).toEqual(['clears', 'missesOne', 'missesTwo'])
    })

    it('ranks a player close on every requirement above one who clears more but is far on the rest', () => {
        const reqs = [main('points_total', 100), main('kills_total', 100), main('aces_total', 100)]
        const {rows} = evaluateSpecQualification(
            [
                player('spiky', {points_total: 100, kills_total: 20, aces_total: 20}),
                player('consistent', {points_total: 95, kills_total: 95, aces_total: 95}),
            ],
            reqs,
            0
        )
        expect(rows.map(r => r.username)).toEqual(['consistent', 'spiky'])
    })

    it('measures secondary proximity by the Nth-best requirement', () => {
        const reqs = [secondary('kills_total', 100), secondary('aces_total', 100)]
        const {rows} = evaluateSpecQualification(
            [
                player('nearOne', {kills_total: 90, aces_total: 0}),
                player('farBoth', {kills_total: 40, aces_total: 40}),
            ],
            reqs,
            1
        )
        expect(rows.map(r => r.username)).toEqual(['nearOne', 'farBoth'])
    })
})
