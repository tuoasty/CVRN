import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok } from '@/shared/types/result'
import type { DBClient, PlayerTeamSeason } from '@/shared/types/db'

vi.mock('@/server/db/players.repo', () => ({
    findPlayerCurrentTeam: vi.fn(),
    findPlayerByRole: vi.fn(),
    setPlayerRole: vi.fn(),
}))
vi.mock('@/server/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { findPlayerCurrentTeam, findPlayerByRole, setPlayerRole } from '@/server/db/players.repo'
import { setPlayerRoleService } from '../setPlayerRole'

const mockSupabase = {} as DBClient

const fakeRecord = { player_id: 'player-1', team_id: 'team-1', season_id: 'season-1', role: 'player' } as PlayerTeamSeason
const updatedRecord = { ...fakeRecord, role: 'captain' } as PlayerTeamSeason

const input = { playerId: 'player-1', teamId: 'team-1', seasonId: 'season-1', role: 'captain' as const }

describe('setPlayerRoleService', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns NOT_FOUND when player is not in any team this season', async () => {
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(null))

        const result = await setPlayerRoleService(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns NOT_FOUND when player is in a different team', async () => {
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok({ ...fakeRecord, team_id: 'other-team' } as PlayerTeamSeason))

        const result = await setPlayerRoleService(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns CONFLICT when captain role is already assigned to another player', async () => {
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(fakeRecord))
        vi.mocked(findPlayerByRole).mockResolvedValue(Ok({ player_id: 'other-player', team_id: 'team-1', season_id: 'season-1', role: 'captain' } as PlayerTeamSeason))

        const result = await setPlayerRoleService(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('CONFLICT')
    })

    it('allows re-assigning the same captain role to the same player', async () => {
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(fakeRecord))
        vi.mocked(findPlayerByRole).mockResolvedValue(Ok({ ...fakeRecord, role: 'captain', player_id: 'player-1' } as PlayerTeamSeason))
        vi.mocked(setPlayerRole).mockResolvedValue(Ok(updatedRecord))

        const result = await setPlayerRoleService(mockSupabase, input)

        expect(result.ok).toBe(true)
    })

    it('sets captain role when slot is empty', async () => {
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(fakeRecord))
        vi.mocked(findPlayerByRole).mockResolvedValue(Ok(null))
        vi.mocked(setPlayerRole).mockResolvedValue(Ok(updatedRecord))

        const result = await setPlayerRoleService(mockSupabase, input)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value.role).toBe('captain')
    })

    it('skips role-taken check when setting player (non-leadership) role', async () => {
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(fakeRecord))
        vi.mocked(setPlayerRole).mockResolvedValue(Ok(fakeRecord))

        const result = await setPlayerRoleService(mockSupabase, { ...input, role: 'player' })

        expect(result.ok).toBe(true)
        expect(vi.mocked(findPlayerByRole)).not.toHaveBeenCalled()
    })
})
