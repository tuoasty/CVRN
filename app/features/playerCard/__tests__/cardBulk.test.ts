import { describe, expect, it } from 'vitest'
import type { CardGroup, CardLayer } from '@/server/domains/playerCard'
import { generateBlocker } from '../cardArt'
import { bulkControlState } from '../cardBulk'

const art: CardLayer = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1, h: 1 }
const group: Pick<CardGroup, 'name' | 'isActive' | 'templates' | 'layers'> = {
    name: 'Base',
    isActive: true,
    templates: [{ id: 't', name: 'Gold', rank: 1, minOvr: 1, previewUrl: null, art: [] }],
    layers: [art],
}
const base = {
    regionSelected: true,
    group,
    dirty: false,
    running: false,
    regionPlayerIds: ['a', 'b', 'c'],
    playerIdsWithCards: ['a', 'outside'],
}

describe('bulkControlState', () => {
    it('has no problem when ready', () => {
        expect(bulkControlState(base).problem).toBeNull()
    })

    it('asks for a region on the All tab', () => {
        expect(bulkControlState({ ...base, regionSelected: false }).problem).toBe('Choose a region to generate in bulk')
    })

    it('asks for a group when there is none', () => {
        expect(bulkControlState({ ...base, group: null }).problem).toBe('Choose a card group')
    })

    it('blocks an inactive group', () => {
        expect(bulkControlState({ ...base, group: { ...group, isActive: false } }).problem).toBe('Base is inactive')
    })

    it('blocks a group with no tiers', () => {
        expect(bulkControlState({ ...base, group: { ...group, templates: [] } }).problem).toBe('Base has no tiers yet')
    })

    it('blocks a group with no saved layout', () => {
        expect(bulkControlState({ ...base, group: { ...group, layers: null } }).problem).toBe('Base has no saved layout')
    })

    it('blocks an unsaved layout', () => {
        expect(bulkControlState({ ...base, dirty: true }).problem).toBe('Save or discard layout changes first')
    })

    it('blocks while running', () => {
        expect(bulkControlState({ ...base, running: true }).problem).toBe('A bulk generation is running')
    })

    it('counts missing and redo', () => {
        const state = bulkControlState(base)
        expect(state.missingCount).toBe(2)
        expect(state.redoCount).toBe(3)
    })
})

describe('generateBlocker during a run', () => {
    const blocker = {
        notReady: 'Pick a player',
        inputProblem: null,
        inactiveGroup: null,
        noTier: null,
        previewingTier: null,
        dirty: false,
        layoutProblem: null,
        layers: [art],
        tierName: 'Gold',
        missing: [],
    }

    it('blocks generate when a run is active', () => {
        expect(generateBlocker({ ...blocker, bulkRunning: 'A bulk generation is running' })).toBe('A bulk generation is running')
    })

    it('ignores the run when none is active', () => {
        expect(generateBlocker({ ...blocker, bulkRunning: null })).toBe('Pick a player')
    })
})
