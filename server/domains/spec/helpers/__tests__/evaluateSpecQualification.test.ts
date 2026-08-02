import {describe, it, expect} from 'vitest'
import {PlayerLeaderboardRow} from '@/server/domains/player'
import {evaluateSpecQualification, EvaluableRequirement} from '../evaluateSpecQualification'

// Only the fields the evaluator touches matter; the rest of the view row is padded
// so the fixture stays readable.
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

    // The footgun this whole guard exists for: hit_eff is null when a player took no
    // attempts, and `null >= 0` is true in JS, so an unguarded compare would qualify
    // every player who never swung.
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
        // The bad key is dropped from checks rather than rendered as a broken row.
        expect(rows[0].checks).toHaveLength(1)
    })

    it('qualifies everyone when there are no requirements at all', () => {
        const {rows} = evaluateSpecQualification([player('empty')], [], 0)
        expect(rows[0].qualified).toBe(true)
    })

    describe('placement bonus', () => {
        const onTeam = (username: string, teamId: string, stats: Record<string, number>) => ({
            ...player(username, stats),
            team_id: teamId,
        })
        const podium = new Map([['champs', 1], ['second', 2], ['third', 3]])

        it('is not applied when no star tier is given', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('a', 'champs', {points_total: 100})],
                [main('points_total', 110)],
                0,
                {placementByTeamId: podium}
            )
            expect(rows[0].placementBonus).toBe(0)
            expect(rows[0].qualified).toBe(false)
        })

        it('lifts a first-place player over a bar they miss on raw stats', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('champ', 'champs', {points_total: 100})],
                [main('points_total', 110)],
                0,
                {stars: 5, placementByTeamId: podium}
            )
            expect(rows[0].placementBonus).toBe(0.15)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(115)
            expect(rows[0].qualified).toBe(true)
        })

        it('penalises 3rd place at 5-star but not at 4-star', () => {
            const bronze = () => [onTeam('bronze', 'third', {points_total: 100})]
            const reqs = [main('points_total', 100)]

            const five = evaluateSpecQualification(bronze(), reqs, 0, {stars: 5, placementByTeamId: podium})
            expect(five.rows[0].placementBonus).toBe(-0.05)
            expect(five.rows[0].qualified).toBe(false)

            const four = evaluateSpecQualification(bronze(), reqs, 0, {stars: 4, placementByTeamId: podium})
            expect(four.rows[0].placementBonus).toBe(0)
            expect(four.rows[0].qualified).toBe(true)
        })

        it('penalises a player whose team missed the podium', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('nobody', 'unranked-team', {points_total: 100})],
                [main('points_total', 95)],
                0,
                {stars: 5, placementByTeamId: podium}
            )
            expect(rows[0].placement).toBeNull()
            expect(rows[0].placementBonus).toBe(-0.1)
            expect(rows[0].checks[0].adjustedValue).toBeCloseTo(90)
            expect(rows[0].qualified).toBe(false)
        })

        // sets_played is a sample-size floor. Scaling it would let a champion clear a
        // 10-set minimum on 9 sets, which is not what the bonus is for.
        it('never scales participation stats', () => {
            const {rows} = evaluateSpecQualification(
                [onTeam('champ', 'champs', {sets_played: 9})],
                [main('sets_played', 10)],
                0,
                {stars: 5, placementByTeamId: podium}
            )
            expect(rows[0].placementBonus).toBe(0.15)
            expect(rows[0].checks[0].adjustedValue).toBe(9)
            expect(rows[0].qualified).toBe(false)
        })
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
})
