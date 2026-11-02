import { describe, expect, it } from 'vitest'
import { computeOverall } from '@/server/domains/overall/helpers/computeOverall'
import { defaultScalingSet } from '@/server/domains/overall/helpers/defaultScalings'
import type { OverallConfig, OverallInputRow } from '@/server/domains/overall/types'
import { buildCardData, buildCustomCardData, seasonLabel } from '../buildCardData'
import { pickSeasonRoster, trustedRobloxAvatarUrl } from '../customSubject'
import { CustomCardValuesSchema } from '../../types'

const player: OverallInputRow = {
    playerId: 'p1',
    robloxUserId: '1',
    username: 'spikerman',
    displayName: 'Spiker',
    avatarUrl: null,
    regionCode: 'NA',
    teamId: 't1',
    teamName: 'Volley Kings',
    teamLogoUrl: null,
    position: 'OUT',
    setsPlayed: 12,
    ranks: { scoring: 0.9, spiking: 0.8, setting: 0.2, blocking: 0.5, receiving: 0.7, serving: 0.6 },
}

const config: OverallConfig = { scalings: defaultScalingSet(), savedPositions: [], overrides: {} }
const computed = computeOverall(player.ranks, config.scalings.OUT, player.setsPlayed)

describe('buildCardData', () => {
    it('uses computed values when there are no overrides', () => {
        const data = buildCardData(player, config, 2)
        expect(data.ovr).toBe(computed.ovr)
        expect(data.attributes).toEqual(computed.attributes)
        expect(data.username).toBe('spikerman')
        expect(data.displayName).toBe('Spiker')
        expect(data.position).toBe('OUT')
    })

    it('prefers the admin board override over the computed OVR', () => {
        expect(buildCardData(player, { ...config, overrides: { p1: 77 } }, 2).ovr).toBe(77)
    })

    it('labels the season with the region code and season number', () => {
        expect(buildCardData(player, config, 2).season).toBe('NA S2')
        expect(seasonLabel('AS', 2)).toBe('AS S2')
    })

    it('drops the region from the season label when the player has none', () => {
        expect(buildCardData({ ...player, regionCode: null }, config, 3).season).toBe('S3')
    })

    it('applies one-time overrides above everything else', () => {
        const data = buildCardData(
            { ...player },
            { ...config, overrides: { p1: 77 } },
            2,
            { username: 'Custom', ovr: 95, position: 'LIB', attributes: { spiking: 99 } },
        )
        expect(data.ovr).toBe(95)
        expect(data.username).toBe('Custom')
        expect(data.displayName).toBe('Custom')
        expect(data.position).toBe('LIB')
        expect(data.attributes.spiking).toBe(99)
        expect(data.attributes.scoring).toBe(computed.attributes.scoring)
    })
})

describe('custom player cards', () => {
    const subject = {
        playerId: null,
        robloxUserId: '1',
        username: 'newguy',
        displayName: 'New Guy',
        avatarUrl: null,
        regionCode: 'AS',
        teamId: null,
        teamName: null,
        teamLogoUrl: null,
    }
    const attributes = { scoring: 70, spiking: 71, setting: 72, blocking: 73, receiving: 74, serving: 75 }

    it('prints the typed values and the subject identity', () => {
        const data = buildCustomCardData(subject, { ovr: 88, position: 'ACE', attributes }, 2)
        expect(data).toEqual({
            username: 'newguy',
            displayName: 'New Guy',
            ovr: 88,
            position: 'ACE',
            teamName: null,
            season: 'AS S2',
            attributes,
        })
    })

    it('stores a blank position as empty', () => {
        expect(buildCustomCardData(subject, { ovr: 88, position: '  ', attributes }, 2).position).toBeNull()
    })

    it('accepts any 3 characters for position and rejects longer ones', () => {
        expect(CustomCardValuesSchema.safeParse({ ovr: 88, position: 'A1!', attributes }).success).toBe(true)
        expect(CustomCardValuesSchema.safeParse({ ovr: 88, position: '', attributes }).success).toBe(true)
        expect(CustomCardValuesSchema.safeParse({ ovr: 88, position: 'ABCD', attributes }).success).toBe(false)
    })

    it('requires the OVR and all six attributes', () => {
        const { serving: _serving, ...missing } = attributes
        expect(CustomCardValuesSchema.safeParse({ ovr: 88, position: '', attributes: missing }).success).toBe(false)
        expect(CustomCardValuesSchema.safeParse({ position: '', attributes }).success).toBe(false)
    })

    it('only trusts https avatar urls on the Roblox CDN', () => {
        expect(trustedRobloxAvatarUrl('https://tr.rbxcdn.com/abc/150/150/AvatarHeadshot/Png')).toBe('https://tr.rbxcdn.com/abc/150/150/AvatarHeadshot/Png')
        expect(trustedRobloxAvatarUrl('http://tr.rbxcdn.com/abc')).toBeNull()
        expect(trustedRobloxAvatarUrl('https://169.254.169.254/latest/meta-data')).toBeNull()
        expect(trustedRobloxAvatarUrl('https://rbxcdn.com.evil.test/a.png')).toBeNull()
        expect(trustedRobloxAvatarUrl('https://evilrbxcdn.com/a.png')).toBeNull()
        expect(trustedRobloxAvatarUrl('not a url')).toBeNull()
        expect(trustedRobloxAvatarUrl(null)).toBeNull()
    })

    it('prefers the current roster, then the latest joined', () => {
        const roster = (id: string, joined_at: string, left_at: string | null) => ({
            joined_at,
            left_at,
            team: { id, name: id, logo_url: null, deleted_at: null },
            season: { region: { code: 'AS' } },
        })
        const old = roster('old', '2026-01-01', '2026-02-01')
        const left = roster('left', '2026-03-01', '2026-04-01')
        const current = roster('current', '2026-02-01', null)
        expect(pickSeasonRoster([old, left, current])?.team?.id).toBe('current')
        expect(pickSeasonRoster([old, left])?.team?.id).toBe('left')
        expect(pickSeasonRoster([])).toBeNull()
    })
})
