import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok, Err } from '@/shared/types/result'
import type { DBClient, Player, Team, PlayerTeamSeason } from '@/shared/types/db'

vi.mock('@/server/db/teams.repo', () => ({
    findTeamById: vi.fn(),
}))
vi.mock('@/server/db/players.repo', () => ({
    findPlayerById: vi.fn(),
    countActivePlayersInTeam: vi.fn(),
    findPlayerCurrentTeam: vi.fn(),
    addPlayerToTeam: vi.fn(),
}))
vi.mock('@/server/utils/runInBackground', () => ({ runInBackground: vi.fn() }))
vi.mock('@/server/domains/player/helpers/lazySyncPlayer', () => ({ lazySyncPlayer: vi.fn() }))
vi.mock('@/server/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { findTeamById } from '@/server/db/teams.repo'
import { findPlayerById, countActivePlayersInTeam, findPlayerCurrentTeam, addPlayerToTeam } from '@/server/db/players.repo'
import { addExistingPlayerToTeam } from '../addExistingPlayerToTeam'

const mockSupabase = {} as DBClient

const fakeTeam = { id: 'team-1', season_id: 'season-1', deleted_at: null } as Team
const fakePlayer = { id: 'player-1', roblox_user_id: '12345', username: 'testplayer' } as Player
const fakeTeamSeason = { player_id: 'player-1', team_id: 'team-1', season_id: 'season-1', role: 'player' } as PlayerTeamSeason

const input = { playerId: 'player-1', teamId: 'team-1' }

describe('addExistingPlayerToTeam', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns NOT_FOUND when team does not exist', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(null))
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))

        const result = await addExistingPlayerToTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns NOT_FOUND when player does not exist', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findPlayerById).mockResolvedValue(Ok(null))

        const result = await addExistingPlayerToTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns CONFLICT when team is at max capacity (16)', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))
        vi.mocked(countActivePlayersInTeam).mockResolvedValue(Ok(16))
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(null))

        const result = await addExistingPlayerToTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('CONFLICT')
    })

    it('returns CONFLICT when player is already on this team', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))
        vi.mocked(countActivePlayersInTeam).mockResolvedValue(Ok(5))
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(fakeTeamSeason))

        const result = await addExistingPlayerToTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('CONFLICT')
    })

    it('returns CONFLICT when player is on a different team in the same season', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))
        vi.mocked(countActivePlayersInTeam).mockResolvedValue(Ok(5))
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok({ ...fakeTeamSeason, team_id: 'other-team' } as PlayerTeamSeason))

        const result = await addExistingPlayerToTeam(mockSupabase, input)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('CONFLICT')
    })

    it('returns Ok with player and teamSeason on success', async () => {
        vi.mocked(findTeamById).mockResolvedValue(Ok(fakeTeam))
        vi.mocked(findPlayerById).mockResolvedValue(Ok(fakePlayer))
        vi.mocked(countActivePlayersInTeam).mockResolvedValue(Ok(5))
        vi.mocked(findPlayerCurrentTeam).mockResolvedValue(Ok(null))
        vi.mocked(addPlayerToTeam).mockResolvedValue(Ok(fakeTeamSeason))

        const result = await addExistingPlayerToTeam(mockSupabase, input)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.player).toEqual(fakePlayer)
            expect(result.value.teamSeason).toEqual(fakeTeamSeason)
        }
    })
})
