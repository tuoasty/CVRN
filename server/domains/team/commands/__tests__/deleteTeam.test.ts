import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok } from '@/shared/types/result'
import type { DBClient, Team, Player } from '@/shared/types/db'

vi.mock('@/server/db/teams.repo', () => ({
    findTeamById: vi.fn(),
    softDeleteTeamById: vi.fn(),
}))
vi.mock('@/server/db/players.repo', () => ({
    findAllTeamPlayers: vi.fn(),
    bulkRemovePlayersFromTeam: vi.fn(),
}))
vi.mock('@/server/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { findTeamById, softDeleteTeamById } from '@/server/db/teams.repo'
import { findAllTeamPlayers, bulkRemovePlayersFromTeam } from '@/server/db/players.repo'
import { deleteTeam } from '../deleteTeam'

const mockSupabase = {} as DBClient

const fakeTeam = { id: 'team-1', season_id: 'season-1', deleted_at: null } as Team
const fakePlayer = { id: 'player-1', roblox_user_id: '12345', username: 'testplayer' } as Player

const input = { teamId: 'team-1' }

describe('deleteTeam', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns NOT_FOUND when team does not exist', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(null))

        const result = await deleteTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns NOT_FOUND when team is already soft-deleted', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok({ ...fakeTeam, deleted_at: '2026-01-01T00:00:00Z' } as Team))

        const result = await deleteTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('soft-deletes team with no players', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findAllTeamPlayers).mockResolvedValue(Ok([]))
        vi.mocked(bulkRemovePlayersFromTeam).mockResolvedValue(Ok(true))
        vi.mocked(softDeleteTeamById).mockResolvedValue(Ok(undefined))

        const result = await deleteTeam(mockSupabase, input)

        expect(result.ok).toBe(true)
        expect(vi.mocked(softDeleteTeamById)).toHaveBeenCalledWith(mockSupabase, 'team-1')
    })

    it('removes all players before soft-deleting when team has players', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findAllTeamPlayers).mockResolvedValue(Ok([{ player: fakePlayer }, { player: { ...fakePlayer, id: 'player-2' } as Player }]))
        vi.mocked(bulkRemovePlayersFromTeam).mockResolvedValue(Ok(true))
        vi.mocked(softDeleteTeamById).mockResolvedValue(Ok(undefined))

        const result = await deleteTeam(mockSupabase, input)

        expect(result.ok).toBe(true)
        expect(vi.mocked(bulkRemovePlayersFromTeam)).toHaveBeenCalledWith(
            mockSupabase,
            'season-1',
            ['player-1', 'player-2']
        )
    })
})
