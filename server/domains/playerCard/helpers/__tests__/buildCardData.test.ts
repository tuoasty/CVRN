import { describe, expect, it } from 'vitest'
import { computeOverall } from '@/server/domains/overall/helpers/computeOverall'
import { defaultScalingSet } from '@/server/domains/overall/helpers/defaultScalings'
import type { OverallConfig, OverallInputRow } from '@/server/domains/overall/types'
import { buildCardData } from '../buildCardData'

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
        const data = buildCardData(player, config)
        expect(data.ovr).toBe(computed.ovr)
        expect(data.attributes).toEqual(computed.attributes)
        expect(data.username).toBe('spikerman')
        expect(data.displayName).toBe('Spiker')
        expect(data.position).toBe('OUT')
    })

    it('prefers the admin board override over the computed OVR', () => {
        expect(buildCardData(player, { ...config, overrides: { p1: 77 } }).ovr).toBe(77)
    })

    it('applies one-time overrides above everything else', () => {
        const data = buildCardData(
            { ...player },
            { ...config, overrides: { p1: 77 } },
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
