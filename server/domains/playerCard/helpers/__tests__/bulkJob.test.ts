import { describe, expect, it } from 'vitest'
import type { OverallInputRow } from '@/server/domains/overall/types'
import type { CardBulkJobRow } from '@/shared/types/db'
import type { CardGroup, CardLayer, CardTemplateSummary } from '../../types'
import { bulkStartProblem, selectBulkPlayers, toCardBulkJob } from '../bulkJob'

const player = (playerId: string, regionCode: string | null): OverallInputRow => ({ playerId, username: playerId, regionCode }) as OverallInputRow

const art: CardLayer = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 100, h: 100 }
const tier = (name: string, minOvr: number, hasArt: boolean): CardTemplateSummary => ({
    id: name,
    name,
    rank: 1,
    minOvr,
    previewUrl: null,
    art: hasArt ? [{ name: 'bg.png', url: 'https://x/bg.png', size: 1 }] : [],
})
const group = (patch: Partial<CardGroup> = {}): CardGroup => ({
    id: 'g',
    name: 'Base',
    isActive: true,
    sortOrder: 0,
    width: 100,
    height: 100,
    layers: [art],
    layersProblem: null,
    problem: null,
    templates: [tier('Gold', 1, true)],
    ...patch,
})
const players = [player('a', 'AS')]
const ovrOf = () => 50

describe('selectBulkPlayers', () => {
    const rows = [player('a', 'AS'), player('b', 'EU'), player('c', null), player('d', 'as')]

    it('keeps the region, case-insensitively', () => {
        const kept = selectBulkPlayers(rows, { regionCode: 'as', mode: 'all', existingPlayerIds: [] })
        expect(kept.map(row => row.playerId)).toEqual(['a', 'd'])
    })

    it('all mode keeps players who already have a card', () => {
        const kept = selectBulkPlayers(rows, { regionCode: 'AS', mode: 'all', existingPlayerIds: ['a'] })
        expect(kept.map(row => row.playerId)).toEqual(['a', 'd'])
    })

    it('missing mode removes players who already have a card', () => {
        const kept = selectBulkPlayers(rows, { regionCode: 'AS', mode: 'missing', existingPlayerIds: ['a'] })
        expect(kept.map(row => row.playerId)).toEqual(['d'])
    })
})

describe('bulkStartProblem', () => {
    it('rejects an unknown group', () => {
        expect(bulkStartProblem({ group: undefined, players, ovrOf })).toBe('Card group not found')
    })

    it('rejects an inactive group', () => {
        expect(bulkStartProblem({ group: group({ isActive: false }), players, ovrOf })).toBe('Base is inactive')
    })

    it('rejects a group with no tiers', () => {
        expect(bulkStartProblem({ group: group({ templates: [] }), players, ovrOf })).toBe('Base has no tiers')
    })

    it('rejects a group with no valid layout', () => {
        expect(bulkStartProblem({ group: group({ layers: null }), players, ovrOf })).toBe('Base has no saved layout')
        expect(bulkStartProblem({ group: group({ layers: [] }), players, ovrOf })).toBe('Base has no saved layout')
    })

    it('rejects no players', () => {
        expect(bulkStartProblem({ group: group(), players: [], ovrOf })).toBe('No players to generate')
    })

    it('names a tier these players land on that has no art', () => {
        const templates = [tier('Ruby', 40, false), tier('Gold', 1, true)]
        expect(bulkStartProblem({ group: group({ templates }), players, ovrOf })).toBe('Ruby has no art yet')
    })

    it('allows a tier without art when nobody lands on it', () => {
        const templates = [tier('Ruby', 90, false), tier('Gold', 1, true)]
        expect(bulkStartProblem({ group: group({ templates }), players, ovrOf })).toBeNull()
    })

    it('does not reject a player below the lowest floor', () => {
        const templates = [tier('Gold', 60, true)]
        expect(bulkStartProblem({ group: group({ templates }), players, ovrOf })).toBeNull()
    })
})

describe('toCardBulkJob', () => {
    const row = {
        id: 'j',
        season_number: 3,
        region_code: 'AS',
        group_id: 'g',
        mode: 'missing',
        status: 'running',
        stop_requested: false,
        stop_reason: null,
        total: 5,
        done: 2,
        failed: 1,
        failures: [{ playerId: 'a', username: 'a', message: 'no headshot' }],
        current_username: 'b',
        started_at: '2026-11-02T00:00:00Z',
        finished_at: null,
    } as unknown as CardBulkJobRow

    it('maps a row', () => {
        expect(toCardBulkJob(row)).toEqual({
            id: 'j',
            seasonNumber: 3,
            regionCode: 'AS',
            groupId: 'g',
            mode: 'missing',
            status: 'running',
            stopRequested: false,
            stopReason: null,
            total: 5,
            done: 2,
            failed: 1,
            failures: [{ playerId: 'a', username: 'a', message: 'no headshot' }],
            currentUsername: 'b',
            startedAt: '2026-11-02T00:00:00Z',
            finishedAt: null,
        })
    })

    it('treats non-array failures as empty', () => {
        expect(toCardBulkJob({ ...row, failures: null } as unknown as CardBulkJobRow).failures).toEqual([])
    })
})
