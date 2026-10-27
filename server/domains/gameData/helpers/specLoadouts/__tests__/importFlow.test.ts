import { describe, expect, it } from 'vitest'
import { buildSpecLinkPlan, type LinkSpec } from '../linkPlan'
import { publishBlocker, publishBlockerText, seedProposalDecisions, summarizeSpecWrites } from '../importFlow'
import type { SpecLoadout } from '../../../types/datasets'
import type { SpecLinkDecision } from '../../../types/specLinks'

const specs: LinkSpec[] = [
    { id: 'a', name: 'Wilfredo León', stars: 5, position: 'OUT', height: 79, game_key: null, is_custom: false },
    { id: 'b', name: 'TJ Defalco', stars: 4, position: 'OUT', height: 77, game_key: null, is_custom: false },
    { id: 'c', name: 'Earvin Ngapeth', stars: 5, position: 'OUT', height: 76, game_key: 'Earvin Ngapeth', is_custom: false },
]

const loadout = (key: string, height = 1.3): SpecLoadout => ({
    key, name: key, height, cooldown: 1, endOnSpike: false, maxPower: 1, activeMaxPower: 1, passive: [], active: [], tuning: [],
})

const plan = buildSpecLinkPlan([loadout('Wilfredo Leon'), loadout('T.J DeFalco'), loadout('Earvin Ngapeth'), loadout('New Guy'), loadout('Old Twin')], specs, new Set(['Old Twin']))

describe('seedProposalDecisions', () => {
    it('seeds a link for every exact item only', () => {
        expect(seedProposalDecisions(plan)).toEqual({
            'Wilfredo Leon': { gameKey: 'Wilfredo Leon', action: 'link', specId: 'a', rename: false },
            'T.J DeFalco': { gameKey: 'T.J DeFalco', action: 'link', specId: 'b', rename: false },
        })
        expect(seedProposalDecisions(buildSpecLinkPlan([loadout('Earvin Ngapeth')], specs))).toEqual({})
    })
})

describe('summarizeSpecWrites', () => {
    it('summarizes writes', () => {
        const decisions: Record<string, SpecLinkDecision> = {
            ...seedProposalDecisions(plan),
            'T.J DeFalco': { gameKey: 'T.J DeFalco', action: 'link', specId: 'b', rename: true },
            'New Guy': { gameKey: 'New Guy', action: 'create', stars: 4, position: 'SET' },
            'Old Twin': { gameKey: 'Old Twin', action: 'skip' },
        }
        expect(summarizeSpecWrites(plan, decisions)).toEqual({ links: 2, proposed: 2, picked: 0, created: 1, custom: 0, skipped: 0, left: 0, renamed: 1 })
    })

    it('counts an overridden proposal with no decision as nothing', () => {
        const decisions = seedProposalDecisions(plan)
        delete decisions['T.J DeFalco']
        expect(summarizeSpecWrites(plan, decisions)).toEqual({ links: 1, proposed: 1, picked: 0, created: 0, custom: 0, skipped: 0, left: 0, renamed: 0 })
    })

    it('counts a link to another spec as picked and a new skip as skipped', () => {
        const decisions: Record<string, SpecLinkDecision> = {
            'Wilfredo Leon': { gameKey: 'Wilfredo Leon', action: 'link', specId: 'b', rename: false },
            'T.J DeFalco': { gameKey: 'T.J DeFalco', action: 'skip' },
            'New Guy': { gameKey: 'New Guy', action: 'leave' },
        }
        expect(summarizeSpecWrites(plan, decisions)).toEqual({ links: 1, proposed: 0, picked: 1, created: 0, custom: 0, skipped: 1, left: 1, renamed: 0 })
    })

    it('counts a custom decision as custom, not skipped', () => {
        const decisions: Record<string, SpecLinkDecision> = { 'New Guy': { gameKey: 'New Guy', action: 'custom' } }
        expect(summarizeSpecWrites(plan, decisions)).toEqual({ links: 0, proposed: 0, picked: 0, created: 0, custom: 1, skipped: 0, left: 0, renamed: 0 })
    })
})

describe('publishBlocker', () => {
    const ok = { stale: false, canPublish: true, planErrors: 0, undecided: 0, hasChanges: true, specOps: 0 }

    it('picks the first blocker', () => {
        expect(publishBlocker(ok)).toBeNull()
        expect(publishBlocker({ ...ok, stale: true, undecided: 3 })).toBe('stale')
        expect(publishBlocker({ ...ok, planErrors: 1, undecided: 3 })).toBe('errors')
        expect(publishBlocker({ ...ok, canPublish: false })).toBe('errors')
        expect(publishBlocker({ ...ok, undecided: 3 })).toBe('undecided')
        expect(publishBlocker({ ...ok, hasChanges: false })).toBe('nothing')
        expect(publishBlocker({ ...ok, hasChanges: false, specOps: 2 })).toBeNull()
    })

    it('writes the reason', () => {
        expect(publishBlockerText('stale', 0)).toBe('Preview again first.')
        expect(publishBlockerText('errors', 0)).toBe('Fix the errors above first.')
        expect(publishBlockerText('undecided', 3)).toBe('3 left')
        expect(publishBlockerText('nothing', 0)).toBe('Matches what is stored.')
    })
})
