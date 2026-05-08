import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok, Err } from '@/shared/types/result'
import type { DBClient, Player, PlayerTeamSeason } from '@/shared/types/db'

vi.mock('@/server/db/players.repo', () => ({
    findPlayerById: vi.fn(),
    findPlayerCurrentTeam: vi.fn(),
    removePlayerFromTeam: vi.fn(),
}))
vi.mock('@/server/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { findPlayerById, findPlayerCurrentTeam, removePlayerFromTeam } from '@/server/db/players.repo'
import { removePlayerFromTeamService } from '../removePlayerFromTeam'

const mockSupabase = {} as DBClient

const fakePlayer = { id: 'player-1', roblox_user_id: '12345', username: 'testplayer' } as Player
const fakeTeamSeason = { player_id: 'player-1', team_id: 'team-1', season_id: 'season-1', role: 'player' } as PlayerTeamSeason

const input = { playerId: 'player-1', seasonId: 'season-1' }

describe('removePlayerFromTeamService', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns NOT_FOUND when player does not exist', async () => {
        vi.mocked(findPlayerById).mockResolvedValue(Ok(null))

        const result = await removePlayerFromTeamService(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns NOT_FOUND when player is not in any team this season', async () => {
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(null))

        const result = await removePlayerFromTeamService(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns Ok with removed teamSeason on success', async () => {
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(fakeTeamSeason))
        vi.mocked(removePlayerFromTeam).mockResolvedValue(Ok(fakeTeamSeason))

        const result = await removePlayerFromTeamService(mockSupabase, input)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toEqual(fakeTeamSeason)
    })
})
